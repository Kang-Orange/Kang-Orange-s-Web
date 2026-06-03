export default defineEventHandler(async (event) => {
  const supabase = getSupabase()
  const id = getRouterParam(event, 'id')

  // 1. Get author
  const { data: author, error } = await supabase
    .from('novel_authors')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw createError({ statusCode: 404, message: 'Author not found' })

  // 2. Get novel IDs + roles from junction table
  const { data: links } = await supabase
    .from('novel_author_links')
    .select('novel_id, role')
    .eq('author_id', id)

  if (!links || links.length === 0) {
    return { ...author, works: [] }
  }

  const novelIds = links.map(l => l.novel_id)
  const roleMap = new Map(links.map(l => [l.novel_id, l.role]))

  // 3. Fetch full novel data with tags
  const { data: novels } = await supabase
    .from('novels')
    .select(`*, novel_tags ( tags ( name ) )`)
    .in('id', novelIds)
    .order('read_date', { ascending: false })

  const works = (novels || []).map((n: any) => ({
    ...n,
    tags: n.novel_tags.map((nt: any) => nt.tags.name),
    authors: [{ id: author.id, name: author.name, avatar_url: author.avatar_url, role: roleMap.get(n.id) || 'writer' }],
  }))

  return { ...author, works }
})
