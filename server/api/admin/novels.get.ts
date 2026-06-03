export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()

  const { data: novels, error } = await supabase
    .from('novels')
    .select(`
      *,
      novel_tags ( tags ( name ) ),
      novel_author_links ( role, novel_authors ( id, name, avatar_url ) )
    `)
    .order('read_date', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return novels.map((novel: any) => ({
    ...novel,
    tags: novel.novel_tags.map((nt: any) => nt.tags.name),
    authors: novel.novel_author_links.map((nal: any) => ({
      id: nal.novel_authors.id,
      name: nal.novel_authors.name,
      avatar_url: nal.novel_authors.avatar_url,
      role: nal.role,
    })),
  }))
})
