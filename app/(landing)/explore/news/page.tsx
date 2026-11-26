import ExploreCategoryPage from "../[category]/page"

export default async function NewsPage() {
  return ExploreCategoryPage({
    params: Promise.resolve({ category: "news" }),
  })
}
