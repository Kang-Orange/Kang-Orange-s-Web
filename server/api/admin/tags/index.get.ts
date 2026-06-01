export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()

  const { data: tags, error } = await supabase
    .from('tags')
    .select('id, name, category_id')
    .order('name')

  if (error) throw createError({ statusCode: 500, message: error.message })

  return tags
})
