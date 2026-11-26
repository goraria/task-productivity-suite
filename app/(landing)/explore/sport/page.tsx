import ExploreCategoryPage from "../[category]/page"

export default async function SportsPage() {
  return ExploreCategoryPage({
    params: Promise.resolve({ category: "sport" }),
  })
}
