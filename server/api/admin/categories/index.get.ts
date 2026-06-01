export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('tag_categories')
    .select('*')
    .order('sort_order')

  if (error) throw createError({ statusCode: 500, message: error.message })

  return data
})
