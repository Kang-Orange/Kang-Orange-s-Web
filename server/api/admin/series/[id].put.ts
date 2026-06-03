export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { data: series, error } = await supabase
    .from('novel_series')
    .update({
      name: body.name,
      description: body.description,
      cover_url: body.cover_url,
      sort_order: body.sort_order ?? 0,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  return series
})
