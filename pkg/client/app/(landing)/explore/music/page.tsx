import ExploreCategoryPage from "../[category]/page"

export default async function MusicPage() {
  return ExploreCategoryPage({
    params: Promise.resolve({ category: "music" }),
  })
}
