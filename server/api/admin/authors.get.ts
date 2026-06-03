export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()

  const { data: authors, error } = await supabase
    .from('novel_authors')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Count works per author
  const { data: links } = await supabase
    .from('novel_author_links')
    .select('author_id')

  const countMap = new Map<number, number>()
  for (const l of (links || [])) {
    countMap.set(l.author_id, (countMap.get(l.author_id) || 0) + 1)
  }

  return (authors || []).map(a => ({
    ...a,
    works_count: countMap.get(a.id) || 0,
  }))
})
