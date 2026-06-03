export default defineEventHandler(async () => {
  const supabase = getSupabase()

  const { data: seriesList, error } = await supabase
    .from('novel_series')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return seriesList
})
