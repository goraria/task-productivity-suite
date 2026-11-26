# GorTou: triển khai chức năng và kiểm chứng

> OAuth update — 2026-11-13: all confidential SSO token exchanges use fixed `client_secret_basic` in code; there is no auth-method environment selector. Business APIs keep `Bearer` tokens. Public PKCE clients keep `none`. A registered Post client needs a native Basic replacement and coordinated ID/secret/binding cutover.

> Runtime update (2026-11-06): standalone workers have been replaced by Vercel Queues. Worker-specific instructions below are historical. Use `bun dev` and the setup in [Managed background processing](https://github.com/gorth-io/ecosystem/blob/main/docs/managed-background-en.md), including Queue credentials and Cron recovery. Existing cross-service OAuth grants still apply.

Ngày: 28/10/2026. Phạm vi: Task và API cần thiết trong Notify, Media, Insight, Payment. Không chỉnh sửa ứng dụng dọc khác, SSO hoặc package dùng chung.

Đây là báo cáo phần đã triển khai và bằng chứng kiểm thử; không phải xác nhận tương đương toàn bộ Notion/Jira hoặc đã vận hành production với nhà cung cấp thật.

## 1. Chức năng và đường truy cập

| Năng lực        | Phần triển khai                                                                                                                                                                                     | Bằng chứng chính                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Workspace       | Tạo workspace và membership owner trong cùng transaction; mời/nhận/từ chối lời mời; quản lý thành viên; rời workspace; chuyển ownership, gồm trường hợp owner cũ thiếu membership                   | `models/workspace.ts`, `models/workspace-member.ts`, `components/productivity/member-management.tsx` |
| Quyền hiệu lực  | Một chính sách dùng cho list/detail/write và snapshot Resource; mức view/comment/edit/manage; kiểm tra workspace, database, ancestor và chế độ restricted                                           | `database/authorization.ts`, `models/index.ts`                                                             |
| Quyền riêng tư  | Restricted không tự mở lại sau khi thu hồi grant cuối; workspace/user/public grants tách biệt; guest/viewer không được ghi; người không có manage không được cấp quyền                              | Test cloud grants, ancestor, Resource snapshot                                                                |
| Tài liệu        | Cây page, chuyển parent, chống vòng lặp kể cả hai thao tác đồng thời; archive/restore; tìm title và nội dung text block; phân trang tài liệu                                                        | `models/page.ts`, `components/productivity/document-library.tsx`, editor                                   |
| Editor          | Autosave; todo checked lưu bền vững; giữ metadata block; trạng thái lỗi/retry; undo/redo cục bộ; lưu bản nháp khi mất mạng; cảnh báo rời trang qua link hoặc đóng tab                               | `hooks/use-editor-draft.ts`, `utils/editor.ts`                                                                |
| Xung đột        | Page/block bắt buộc phiên bản; trả 428 nếu thiếu và 409 nếu cũ; giữ draft; cho so sánh với phiên bản mới và áp dụng lại có chủ ý                                                                    | CRUD transaction + cloud ghi đồng thời                                                                        |
| Lịch sử         | Snapshot trước cập nhật page/block; xem lịch sử phân trang; restore tạo phiên bản mới, không khôi phục ACL cũ                                                                                       | `models/document-revision.ts`, `/task/document/:id/revision`, `/restore`                                            |
| Cộng tác        | Presence hết hạn sau 90 giây; heartbeat và làm mới dữ liệu mỗi 30 giây khi tab đang hiển thị; không hiển thị người đã mất quyền                                                                     | `document_presence`, `models/document-presence.ts`                                                          |
| Database        | Table, board, gallery, list, calendar tháng, timeline theo Date; giữ filter/sort vào view; chọn loại view khi tạo; server pagination/count                                                          | `database-workspace.tsx`, `database-views.tsx`, `models/page.ts`                                |
| Property        | Giá trị typed; chọn person/relation/file theo tên; select/multi-select kiểm tra options; trường tính toán chỉ đọc; hiện lỗi lưu và khóa ô không có quyền edit                                       | `schemas/productivity.ts`, `models/index.ts`                                                               |
| Formula/rollup  | AST giới hạn độ sâu/số node; không eval; hỗ trợ add/subtract/multiply/divide/concat/if/equal; rollup count/sum/average/minimum/maximum; loại page liên quan không có quyền đọc                      | `utils/formula-query.ts`, `models/page.ts`, cloud computed filter/sort                            |
| Quản lý issue   | Số issue riêng workspace; task/bug/story/epic; workflow; priority; assignee; estimate; due date; dependency chống cycle và chặn Done khi còn phụ thuộc; tìm/lọc/phân trang                          | `/issue`, `models/work-item.ts`                                                                       |
| Sprint          | Planned → active → completed; chỉ một active sprint; ngày bắt đầu/kết thúc; đưa issue chưa hoàn tất về backlog và tăng phiên bản; báo cáo số lượng/điểm theo trạng thái                             | `/task/sprint`, `/task/report`                                                                                |
| Automation      | Tối đa 20 rule/workspace; trigger issue created/updated; đổi status hoặc assignee; tuân thủ workflow; theo dõi rule đã chạy để retry không chạy lặp                                                 | `services/automation.ts`, workspace settings, test cloud                                                      |
| Xuất/nhập       | JSON định dạng `gorth-document`, version 1; có thao tác trên giao diện; import trong transaction; kiểm tra giới hạn và URL                                                                          | Document library và `/task/document/import`, `/:id/export`                                                    |
| Guest/public    | Mời tài khoản đã mở Task; cấp quyền theo page; publish/unpublish qua thao tác riêng; public preview lấy dữ liệu thật, không trả grant/member/history hoặc URL attachment riêng tư                   | `/preview/[id]`, sharing panel                                                                                |
| Media           | Upload ký sẵn, hoàn tất, xác minh asset rồi mới gắn page; chống gắn asset sai page/app hoặc chưa ready; deduplicate gắn đồng thời; hủy upload; download kiểm tra quyền hiện tại rồi ký URL ngắn hạn | `models/file.ts`, Media `/media/task/asset-url`                                                   |
| Resource        | Comment/favorite dùng Resource; snapshot quyền dùng cùng chính sách; scheduler, lease, giới hạn, OAuth machine token và ACK có fence                                                                | `models/resource-policy-outbox.ts`, các test Resource                                                         |
| Notify          | Inbox/read/archive/preferences; worker phát thay đổi issue cho assignee còn quyền; trusted publisher có thể tạo notification profile trước lần mở Inbox đầu tiên; mute in-app được áp dụng          | `/inbox`, Notify event API                                                                                    |
| Discovery       | Search riêng tư ở Task; chỉ nội dung được publish mới được gửi sang index công khai; tombstone khi unpublish/archive/xóa workspace; retry dùng snapshot/cursor mới nhất                             | `/search`, `models/task-event-outbox.ts`                                                                          |
| Insight         | Ghi analytics/audit qua endpoint machine riêng; activity workspace chỉ manager xem; giữ thời điểm phát sinh và idempotency key; không gửi body tài liệu/URL attachment                              | `/activity`, Insight `/insight/task/event`, `/insight/task/activity`                                          |
| Billing/Payment | Catalog, subscription, invoice, entitlement, thanh toán/reconcile; hỗ trợ hosted checkout hoặc Stripe Payment Element; tái sử dụng checkout đang chờ theo idempotency                               | `/billing`, Payment checkout-resume tests                                                                     |
| Vận hành        | Outbox bền vững; lease; retry/backoff; xử lý từng service độc lập; ưu tiên sự kiện issue; drain nhiều batch trong thời gian giới hạn; manager xem trạng thái và retry                               | `/activity`, `/task/event/dispatch`, `services/background.ts`                                                 |

Calendar/timeline hiển thị **trang kết quả hiện tại** và có thông báo rõ trên giao diện; phân trang/lọc phía server áp dụng chung cho các view. Timeline hiện dùng một mốc Date, không phải biểu đồ duration kéo thả.

## 2. Phân quyền và bảo toàn auth

- Không thay đổi 20 file luồng auth đã được lưu hash trước khi làm: server/client Better Auth, session, OAuth, backchannel và các file auth liên quan trong danh sách kiểm tra. Kiểm tra bàn giao: 20/20 hash khớp. Lockfile của Task và các service sửa không thay đổi; không cài/chỉnh dependency trong `node_modules`.
- Không sửa `.env.local`, không thêm JWT/session engine hoặc cookie fallback.
- Phân quyền tài liệu là chính sách nghiệp vụ Task, tách khỏi xác thực phiên đang ổn định. Role quản trị lấy từ user cục bộ Task, không suy ra từ role ở SSO.
- Grant comment của Resource không cấp quyền ghi tài liệu Task.
- Publication/access-mode có endpoint transaction riêng. PATCH page thông thường không được dùng để lách các thao tác chia sẻ này.
- Native Better Auth `verifyAccessTokenRequest` xác minh JWT cho dispatch, policy sync, Media delegate, Insight và endpoint storage. Client credentials của worker dùng `clientCredentialsTokenRequest` có sẵn.
- Endpoint credentials không nhận session browser, không nhận user grant thông thường, kiểm tra audience đầy đủ, subject máy khớp client_id, scope và TTL tối đa 120 giây. HTTPS bắt buộc khi deploy.

## 3. Schema và migration trên Neon

Migration: `database/migrations/20261028-task-productivity.sql`.

Đã thêm/sửa phần nghiệp vụ:

- `page.version`, `block.version`, `page.access_mode`, `database.access_mode`.
- `document_revision`, `document_presence`, `sprint`, `work_item`, `issue_dependency`.
- `task_event_outbox`: chỉ lưu phối hợp delivery, UUID, revision, lease, attempts, error code; không phải bản sao notification/search/audit/payment/media.
- Index grant/revision/outbox và trigger để phát sự kiện, đồng bộ public-grant/ancestor, giữ tombstone khi xóa workspace.
- Sửa FK sai ở `permission.subject_id`: subject user và workspace là hai loại ID khác nhau; không thể cùng bắt buộc tham chiếu `user.id`. Kiểm tra subject theo loại được giữ ở service và trigger.
- Bỏ FK cascade từ outbox sang workspace để sự kiện gỡ index không bị xóa trước khi giao. UUID lịch sử vẫn được lưu trong outbox.

Không thêm bảng notification, comment, bookmark, search index, payment, subscription, entitlement, audit/moderation/risk hoặc S3 asset vào Task. Bảng `file` có sẵn được dùng làm liên kết từ page đến asset của Media.

SHA-256 của migration đã áp: `276ac921762c444abaee5c4a2776c1376c30db57cad487611a5e8274861a957f`.

Migration không DROP/TRUNCATE bảng nghiệp vụ hoặc sửa bảng auth/session/account. Có thay đổi constraint nghiệp vụ như mô tả trên; không nên gọi đây là migration chỉ thêm cột. Chạy lại được, có advisory lock và transaction. Test chỉ tạo và dọn fixture UUID của mình; việc kiểm thử có thể tăng revision của singleton Resource policy theo trigger bình thường.

Lệnh vận hành:

```sh
pnpm db:migrate-domain
pnpm test:cloud
```

Đây là migration bổ sung trên schema Task đang có, không phải bootstrap toàn bộ một database trống chưa có schema nền. Không dùng `db:push` thay thế rồi bỏ qua các trigger trong file SQL.

## 4. Cấu hình cần bổ sung trước khi chạy các tích hợp thật

### Task: env server của đúng app Task

Giữ nguyên cấu hình đăng nhập hiện tại. Các biến mới/biến tích hợp cần điền nằm trong `.env.example`:

```dotenv
NEXT_OAUTH_CLIENT_ID=<existing-confidential-backend-client>
NEXT_OAUTH_CLIENT_SECRET=<existing-confidential-client-secret>
AWS_ENDPOINT_URL_S3=<https-storage-origin>
AWS_ACCESS_KEY_ID=<private-key>
AWS_SECRET_ACCESS_KEY=<private-secret>
AWS_REGION=ap-southeast-1
AWS_BUCKET=<actual-bucket-name>
```

Task không cần AWS SDK. Endpoint, key và bucket không lấy từ browser và không lưu key vào metadata.

Các audience/upstream dùng 7 biến đã có trong app: Notify 5052, Resource 5053, Discovery 5054, Payment 5055, Billing 5056, Media 5057, Insight 5058 cho local; khi deploy thay bằng origin HTTPS tương ứng. Tất cả service phải dùng cùng issuer SSO với Task. Không tự sửa public OAuth client đang đăng nhập ổn định để biến nó thành machine client.

### Tái sử dụng confidential client qua SSO

Task dùng một confidential client cho đăng nhập genericOAuth + PKCE và mọi thao tác máy. Hai biến private `NEXT_OAUTH_CLIENT_ID/SECRET` tham chiếu cùng identity; token và scope hai luồng vẫn tách biệt. Client cần callback/logout chính xác, requirePKCE=true, Authorization Code + refresh_token + client_credentials. Không chuyển public client cũ bằng SQL, không lấy secret từ hash, không tạo client riêng cho worker/cron/Resource sync. Giữ client cũ đến khi cutover được xác minh.

| Caller                | Resource/audience                                            | Scope cần được admin cấp tại SSO |
| --------------------- | ------------------------------------------------------------ | -------------------------------- |
| Task backend          | Audience Task hiện tại (`NEXT_OAUTH_AUDIENCE`)               | `task:dispatch`                  |
| Task backend          | Origin Resource                                              | `task:resource:policy`           |
| Task backend          | Origin Notify                                                | `task:notification:publish`      |
| Task backend          | Origin Discovery                                             | `task:discovery:write`           |
| Task backend          | Origin Media                                                 | `task:media:delegate`            |
| Task backend          | Origin Insight                                               | `task:insight:publish`           |
| Media backend hiện có | URL đầy đủ `https://<task-host>/internal/storage/credential` | `storage:task:credential`        |

Giữ client Task confidential; `client_secret_basic` phải khớp phương thức đã đăng ký (`client_secret_basic`, mặc định basic). Client Post cũ cần replacement native và cutover ID/secret/binding trước khi deploy. Cấu hình grant `client_credentials` và client_credentials_scopes trên client hiện có qua API/admin Better Auth. Link các resource tương ứng và thêm scope vào allowedScopes của resource, giữ nguyên các scope/grant đang dùng khác. TTL máy tối đa 600 giây; resource credentials riêng tối đa 120 giây, bearer-compatible. Không cấp machine scope cho public client hoặc biến user scope thành machine scope.

Media tái sử dụng client storage-reader hiện có, với cùng ID/secret, qua `NITRO_OAUTH_CLIENT_ID` và `NITRO_OAUTH_CLIENT_SECRET`; phương thức cố định client_secret_basic trong code. Đây là lựa chọn giao thức không phải một secret mới. Không tạo thêm client riêng cho Task storage. Client này vẫn có thể giữ resource/scope storage SSO đã có; chỉ link thêm resource Task và cấp scope `storage:task:credential`. SSO chỉ cấp scope storage này cho Media; Task kiểm tra grant máy và scope, không sao chép allowlist ID Media vào env.

Media/Insight/Resource xác minh JWT bằng Better Auth và quyền machine scope do SSO quản lý. Notify/Discovery cũng lấy quyền publisher/indexer từ machine scope do SSO cấp; không cần sao chép danh sách client-to-application vào env. Mỗi token publisher phải chỉ định đúng một application cho thao tác đó; token có nhiều application publish scope bị từ chối để tránh chọn nhầm tenant.

Cấu hình này là thay đổi metadata/quyền OAuth, không yêu cầu đổi schema database. Không tự động tạo client mới, đổi secret hoặc thay đổi dữ liệu SSO trong phiên sửa code. Nếu chưa có confidential backend client Task thì không thể sử dụng public login client để thay thế; cần có client được quản trị cấp hợp lệ trước khi vận hành worker.

### Đăng ký storage profile/bucket của Task tại Media

Dùng cơ chế registry có sẵn của Media: application `task`, endpoint S3, region, bucket thật, `credentialsUrl=https://<task-host>/internal/storage/credential`, enabled. Liên kết bucket cho application Task, cho phép loại `attachment`, quyền private.

Endpoint/bucket/region trong registry phải khớp env server Task. Cấu hình CORS của object storage cho phép origin Task upload PUT với các signed header mà Media trả về. Không đưa access key/secret key vào registry, request browser hoặc metadata asset.

### Scheduler và provider

- Sau khi Task HTTP deployment chạy: `pnpm worker` trên tiến trình nền riêng, hoặc scheduler gọi hai endpoint dưới đây bằng `Authorization: Bearer <SSO-machine-access-token>` (audience Task, scope `task:dispatch`):
  - `POST /task/resource-policy/dispatch`
  - `POST /task/event/dispatch`
- Resource snapshot hết hạn sau 120 giây: chạy scheduler ít nhất mỗi phút. Script local chạy chu kỳ 30 giây, có kiểm tra busy và không log token.
- Chạy worker riêng của Discovery để tiêu thụ sync queue; Media để xử lý job; Billing cho lifecycle và Notify cho external delivery nếu đã cấu hình. Xem script `worker:build`/`worker` của từng service. Chỉ chạy HTTP service không đồng nghĩa các job nền đang chạy.
- Catalog/plan/price/feature do Billing sở hữu; cần tạo catalog Task bằng API quản trị Billing. Task không seed một chính sách giá hoặc tự đặt paywall.
- Cấu hình payment provider/webhook ở **Payment**, không đưa secret payment vào Task. `NITRO_PAYMENT_SERVER_URL` ở Billing phải trỏ đúng Payment. Với Stripe, thêm secret key/publishable key/webhook secret theo `.env.example` của Payment; các ví khác dùng biến provider tương ứng.
- Email/push vẫn phụ thuộc provider bạn chọn. Luồng in-app không cần provider gửi email. Chưa gửi thông báo ngoài hoặc thu tiền thật trong phiên triển khai này.

Không tạo client hay đổi secret của SSO/Media trong phiên này; các biến mới trỏ tới credentials confidential hiện có. Cần cấp/link đúng machine scopes ở SSO và cấu hình storage profile trước khi vận hành. Các endpoint thiếu cấu hình trả lỗi có kiểm soát, không giả lập thành công.

## 5. Kiểm thử và mức bằng chứng

Lệnh chạy lại:

```sh
pnpm exec vitest run --no-cache --no-fsModuleCache --configLoader native
pnpm test:cloud
pnpm test:platform
pnpm exec tsc --noEmit --incremental false
pnpm exec next build --webpack
```

Kết quả lượt xác minh chuẩn hóa backend OAuth (28/10/2026):

| Bộ kiểm tra                       | Kết quả                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------- |
| Task Vitest                       | 26 files / 156 tests passed                                                   |
| Task Neon integration + migration | 2 files / 20 tests passed ở lượt tính năng trước; không chạy lại đợt OAuth    |
| Notify                            | 8 files / 51 tests passed                                                     |
| Resource                          | 12 files / 85 tests passed                                                    |
| Discovery                         | 6 files / 41 tests passed                                                     |
| Payment                           | 7 files / 44 tests passed                                                     |
| Billing                           | 8 files / 40 tests passed                                                     |
| Media                             | 12 files / 73 tests passed                                                    |
| Insight                           | 7 files / 49 tests passed                                                     |
| TypeScript                        | Passed cho Task và cả 7 service                                               |
| Lint các file Task sửa            | Passed, 0 lỗi / 0 cảnh báo (`--max-warnings 0`)                               |
| Production build                  | Passed (`next build --webpack`), gồm compile, TypeScript, prerender và traces |

Bằng chứng cloud từ lượt triển khai tính năng trước (không dùng để xác nhận live OAuth mới): Neon integration gọi SQL/transaction thật của Task: ACL, cấp/thu hồi quyền, ancestors, hierarchy cycle, concurrent write, revision restore, todo, import/export, public revoke, formula/filter/sort/rollup, dependency/sprint, retry worker, attachment binding, presence, automation, ownership và tombstone xóa workspace. HTTP tới platform trong các test cloud được giả lập để không phát thông báo, index dữ liệu test hoặc thu tiền thật. Kiểm tra chỉ đọc sau test trên Neon trả về `fixture_users=0`, `fixture_workspaces=0`, `remaining_outbox_rows=0`. Bộ migration so sánh schema cột auth trước/sau; fixture được dọn theo UUID/workspace của test, không quét xóa dữ liệu người dùng.

Vitest của 7 service kiểm tra các contract/logic/provider mock hiện có; không phải bằng chứng giao dịch sandbox thành công, object đã được upload lên bucket thật, hoặc tất cả 7 database/service đang chạy. Không chạy kiểm thử trình duyệt có đăng nhập thật trong đợt này. Turbopack gặp lỗi tải font/bind tiến trình PostCSS trong môi trường công cụ; Webpack là phép kiểm chứng production build thay thế, không đổi script build của app.

## 6. Phần nâng cao còn giới hạn

- Presence + polling + optimistic version không phải CRDT/OT; không có đồng bộ từng ký tự/cursor realtime hoặc merge tự động.
- Offline hỗ trợ bản nháp tài liệu theo tài khoản, không phải toàn bộ workspace offline-first hoặc hàng đợi mutation cho mọi nghiệp vụ. Property value/database settings chưa có cơ chế lịch sử/version tương đương block editor.
- Formula là tập AST giới hạn; rollup số học dùng Number property đã lưu. Chưa có toàn bộ hàm, relation UI xuyên database không giới hạn, conditional formatting hoặc công thức của Notion.
- Calendar/timeline là view theo Date trên trang kết quả; chưa có duration range, drag/resize lịch, virtualized dữ liệu vô hạn hoặc gantt/dependency chart.
- Issue có nền workflow/sprint/dependency/report, chưa có toàn bộ custom workflow designer, epic hierarchy sâu, burndown/velocity lịch sử hay JQL của Jira.
- Import/export là JSON định dạng của GorTou; chưa hỗ trợ nhập nguyên workspace Notion/Jira, PDF/DOCX hoặc ZIP các blob attachment. Export tham chiếu không cấp thêm quyền tải attachment.
- Nhúng nâng cao, marketplace integration/plugin, webhook automation tổng quát và rich text WYSIWYG là các phần mở rộng tiếp theo; block editor hiện hỗ trợ các type/metadata và link an toàn đã mô tả.
- Một số danh sách chọn/sidebar dùng cửa sổ 100 mục; thư viện tài liệu/issue/database record/history/activity có phân trang riêng. Chưa có kiểm thử tải lớn, accessibility bằng trình duyệt hoặc đo SLO production.
- Tìm kiếm công khai và quyền Resource có tính nhất quán theo worker/snapshot; download/preview/ghi tài liệu vẫn kiểm tra quyền ở request hiện tại. Cần vận hành scheduler và giám sát delivery, không chỉ deploy frontend.
- Chưa thực hiện live E2E với S3, payment sandbox, email/push và các deployment 7 service. Các bước này cần cấu hình ở mục 4 trước khi có thể xác nhận nghiệm thu production.
