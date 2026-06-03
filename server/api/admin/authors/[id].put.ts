export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { data: author, error } = await supabase
    .from('novel_authors')
    .update({
      name: body.name,
      avatar_url: body.avatar_url,
      bio: body.bio,
      links: body.links || [],
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  return author
})
