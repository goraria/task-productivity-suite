import ExploreCategoryPage from "../[category]/page"

export default async function GamingPage() {
  return ExploreCategoryPage({
    params: Promise.resolve({ category: "gaming" }),
  })
}
