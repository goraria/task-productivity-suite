# Backend OAuth qua SSO

> OAuth update — 2026-11-13: all confidential SSO token exchanges use fixed `client_secret_basic` in code; there is no auth-method environment selector. Business APIs keep `Bearer` tokens. Public PKCE clients keep `none`. A registered Post client needs a native Basic replacement and coordinated ID/secret/binding cutover.

> Runtime update (2026-11-06): standalone workers have been replaced by Vercel Queues. Worker-specific instructions below are historical. Use `bun dev` and the setup in [Managed background processing](https://github.com/gorth-io/ecosystem/blob/main/docs/managed-background-en.md), including Queue credentials and Cron recovery. Existing cross-service OAuth grants still apply.

Ngày cập nhật: 28/10/2026. Phạm vi: Task và Resource/Notify/Discovery/Media/Insight; Payment/Billing giữ nguyên các luồng hiện có. Không sửa đăng nhập người dùng của Task, Chat hoặc app khác.

## Cấu hình còn cần giữ

Task dùng **một confidential client** cho đăng nhập genericOAuth + PKCE và mọi thao tác server-to-server; token người dùng và token máy vẫn tách biệt:

```dotenv
NEXT_OAUTH_CLIENT_ID=<existing-task-backend-client-id>
NEXT_OAUTH_CLIENT_SECRET=<existing-secret-of-that-client>
```

Code cố định Basic; client SSO phải đăng ký client_secret_basic. Client Post cần tạo Basic replacement qua API native, cập nhật ID/secret/binding và kiểm thử trước khi chuyển. Không còn biến chọn method.

Client cần grant Authorization Code, refresh_token, client_credentials, requirePKCE=true, callback/logout đúng app và machine scope ceiling riêng. Public client cũ không thể đổi auth method bằng update: đăng ký confidential client qua API native Better Auth, giữ client cũ trong giai đoạn chuyển. Không dùng session secret hoặc suy ra secret từ client ID. ID mới cần binding chính xác ở các service trước khi chuyển cấu hình app.

Media giữ **cùng confidential client storage-reader hiện có**, chỉ dùng tên cấu hình OAuth thống nhất:

```dotenv
NITRO_OAUTH_CLIENT_ID=<existing-media-client-id>
NITRO_OAUTH_CLIENT_SECRET=<existing-media-client-secret>
```

Các secret giữ tại backend sở hữu chúng. Không chép secret của Media sang Task. Các receiver Resource/Notify/Discovery/Insight không cần client secret để xác minh chữ ký JWT; chúng dùng issuer/JWKS của SSO như trước.

Task giữ nguyên storage của app:

```dotenv
AWS_ENDPOINT_URL_S3=<https-storage-origin>
AWS_ACCESS_KEY_ID=<private-key>
AWS_SECRET_ACCESS_KEY=<private-secret>
AWS_REGION=ap-southeast-1
AWS_BUCKET=<actual-bucket-name>
```

Không sửa hoặc đọc giá trị `.env.local` trong đợt này. Cần chuyển credentials backend đang có sang tên canonical ở cấu hình deployment/server; các biến cũ không còn được runtime đọc. Không sinh secret mới hoặc sửa lockfile/node_modules.

## Quyền cần cấp trên client đang có tại SSO

Dùng trang/API quản trị Better Auth hiện có. Giữ lại các grant/scope/resource đang dùng khác, bổ sung vào client hiện có thay vì tạo client worker/cron/storage-reader mới.

| Caller hiện có | Resource/audience                                            | Machine scope               | TTL tối đa |
| -------------- | ------------------------------------------------------------ | --------------------------- | ---------- |
| Task backend   | `NEXT_OAUTH_AUDIENCE` hiện tại của Task                      | `task:dispatch`             | 600 giây   |
| Task backend   | Origin Resource                                              | `task:resource:policy`      | 600 giây   |
| Task backend   | Origin Notify                                                | `task:notification:publish` | 600 giây   |
| Task backend   | Origin Discovery                                             | `task:discovery:write`      | 600 giây   |
| Task backend   | Origin Media                                                 | `task:media:delegate`       | 600 giây   |
| Task backend   | Origin Insight                                               | `task:insight:publish`      | 600 giây   |
| Media backend  | URL đầy đủ `https://<task-host>/internal/storage/credential` | `storage:task:credential`   | 120 giây   |

Trên client, bật `client_credentials` và đặt rõ `client_credentials_scopes`. Trên resource, thêm scope vào `allowedScopes`, link client/resource theo chính sách SSO đang áp dụng và giữ bearer-compatible. **Chỉ cấp scope storage cho client Media**; chỉ cấp các machine scope Task cho backend được phép làm nghiệp vụ đó. User scope/public-client registration không thay thế machine-scope ceiling. Better Auth phân biệt rõ user access và client-credentials authorization. [Tài liệu OAuth Provider](https://better-auth.com/docs/plugins/oauth-provider).

Không cần đổi schema DB của Task/service. Thay đổi cần thiết ở SSO là metadata/cấp quyền OAuth cho các client/resource hiện có; không thực hiện sửa dữ liệu SSO hoặc tạo client/secret tự động trong phiên này.

## Luồng mới

1. Worker dùng `clientCredentialsTokenRequest` của Better Auth xin token tại SSO; client ID/secret dùng chung với backend Task.
2. Token audience Task, scope `task:dispatch` gọi các endpoint dispatcher. Không có cron password độc lập.
3. Task đẩy snapshot quyền sang Resource bằng token audience Resource, scope `task:resource:policy`. Không ký HMAC và không có shared signing secret.
4. Resource vẫn giữ epoch/revision/snapshot ID, TTL 120 giây, advisory lock, replacement transaction và lease/ACK fence. SHA-256 của body chỉ dùng phát hiện xung đột idempotency, không dùng làm xác thực.
5. Task gọi Notify/Discovery/Media/Insight bằng token đúng audience và machine scope. Notify/Discovery lấy application từ **một scope ứng dụng hợp lệ duy nhất**; không sao chép client-ID map sang env. Token có scope publish/index cho nhiều application bị từ chối để tránh chọn nhầm application.
6. Media xin token bằng confidential client sẵn có, audience đúng URL credentials và scope storage Task; Task kiểm tra JWT, subject máy khớp client_id, không có sid, TTL và scope. Không cấu hình ID Media riêng ở Task.
7. Upload vẫn đi qua registry storage profile/bucket của Media; browser chỉ nhận URL ký sẵn, không nhận key storage. Profile endpoint/region/bucket/credentialsUrl phải khớp cấu hình Task.

Các verifier dùng `verifyAccessTokenRequest` của Better Auth để kiểm tra chữ ký, JWKS, issuer, audience, token type, thời hạn và scope. Logic ứng dụng chỉ bổ sung điều kiện machine identity và phạm vi nghiệp vụ. Cookie/Origin/Fetch header của browser không được dùng cho các thao tác máy này.

## Vận hành và chuyển đổi

- Cấp/link scope tại SSO và cấu hình lại env backend trước khi deploy receiver/sender cùng phiên bản. Không có fallback shared-secret cũ.
- Chạy `pnpm worker` trên tiến trình nền của Task hoặc scheduler có khả năng xin OAuth client-credentials token. Không cần port mới cho worker.
- Scheduler gọi GET/POST `/task/resource-policy/dispatch` và `/task/event/dispatch` bằng `Authorization: Bearer <short-lived-SSO-token>` cho audience Task, scope `task:dispatch`.
- Một HTTP cron thông thường, gồm Vercel Cron chỉ gọi URL, không tự xin token OAuth. Không thể chỉ bỏ header xác thực rồi tiếp tục dùng cron đó; dùng worker hoặc OAuth-aware scheduler. Không mở public endpoint để thay thế.
- Resource cần snapshot heartbeat ít nhất mỗi phút vì projection hết hạn sau 120 giây. Thiếu cấu hình/token/scope hoặc lỗi delivery sẽ fail closed và giữ outbox để thử lại.
- JWT local verification có giới hạn hiệu lực theo TTL, không tra registry trạng thái client mỗi request. Việc ngắt client/scopes phải tính đến token đã phát còn hạn.
- Giữ issuer/service origin nhất quán với SSO đang triển khai; HTTPS khi deploy. Task audience logic và URL app có thể khác nhau: dispatcher dùng audience đã đăng ký, còn endpoint credentials dùng URL đầy đủ của app.

## Kiểm chứng

Có test ký JWT ES256 thật, cấp JWKS qua transport giả lập và chạy verifier Better Auth thật. Các ca kiểm tra gồm machine token hợp lệ, user session, sai scope/issuer/audience, token hết hạn/quá dài, ID token, chữ ký bị sửa, DPoP-bound token dùng như bearer, browser headers, application scope mơ hồ và snapshot retry/ACK.

Kết quả xác minh:

| Bộ kiểm tra               | Kết quả                                                                |
| ------------------------- | ---------------------------------------------------------------------- |
| Task Vitest               | 26 files / 156 tests passed                                            |
| Notify                    | 8 files / 51 tests passed                                              |
| Resource                  | 12 files / 85 tests passed                                             |
| Discovery                 | 6 files / 41 tests passed                                              |
| Payment                   | 7 files / 44 tests passed                                              |
| Billing                   | 8 files / 40 tests passed                                              |
| Media                     | 12 files / 73 tests passed                                             |
| Insight                   | 7 files / 49 tests passed                                              |
| TypeScript                | Task và cả 7 service passed                                            |
| ESLint Task, các file sửa | Passed, 0 lỗi / 0 cảnh báo                                             |
| Task production build     | `next build --webpack` passed: compile, typecheck, prerender và traces |
| Bảo toàn đăng nhập        | 20/20 file auth Task khớp hash ban đầu                                 |
| Storage/dependencies      | Giữ 5 field AWS; không sửa lockfile của Task/7 service                 |

Tổng 539 test hiện tại: 156 Task và 383 service. Không gọi SSO/nhà cung cấp thật, không đổi client secret, không migrate DB trong đợt chuẩn hóa OAuth này. Các test cloud 20 ca trong báo cáo tính năng thuộc lượt triển khai trước, không phải bằng chứng live machine-token integration cho thay đổi này. Cần cấu hình client/resource/scope ở SSO và env server rồi kiểm chứng token thật trước khi vận hành.
