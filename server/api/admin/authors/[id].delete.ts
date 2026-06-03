export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const id = getRouterParam(event, 'id')

  // Clean up junction records first (CASCADE handles this, but explicit for clarity)
  await supabase.from('novel_author_links').delete().eq('author_id', id)

  const { error } = await supabase.from('novel_authors').delete().eq('id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { success: true }
})
