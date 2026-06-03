export default defineEventHandler(async (event) => {
  const supabase = getSupabase()
  const query = getQuery(event)

  let req = supabase
    .from('novels')
    .select(`
      *,
      novel_tags ( tags ( name ) ),
      novel_author_links ( role, novel_authors ( id, name, avatar_url ) )
    `)
    .order('read_date', { ascending: false })

  // Optional series filter
  if (query.series) {
    req = req.eq('series', query.series)
  }

  const { data: novels, error } = await req

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  const result = novels.map((novel: any) => ({
    ...novel,
    tags: novel.novel_tags.map((nt: any) => nt.tags.name),
    authors: novel.novel_author_links.map((nal: any) => ({
      id: nal.novel_authors.id,
      name: nal.novel_authors.name,
      avatar_url: nal.novel_authors.avatar_url,
      role: nal.role,
    })),
  }))

  return result
})
