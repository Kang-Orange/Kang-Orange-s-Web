export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()

  const { data: seriesList, error } = await supabase
    .from('novel_series')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Count novels per series
  const result = await Promise.all(
    (seriesList || []).map(async (s) => {
      const { count } = await supabase
        .from('novels')
        .select('*', { count: 'exact', head: true })
        .eq('series', s.name)

      return { ...s, works_count: count || 0 }
    })
  )

  return result
})
