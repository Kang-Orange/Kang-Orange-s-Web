export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const updateData: Record<string, any> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.category_id !== undefined) updateData.category_id = body.category_id

  const { data, error } = await supabase
    .from('tags')
    .update(updateData)
    .eq('id', id)
    .select('id, name, category_id')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  return data
})
