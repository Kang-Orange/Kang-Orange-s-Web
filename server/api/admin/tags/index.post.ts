export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const insertData: Record<string, any> = { name: body.name }
  if (body.category_id) insertData.category_id = body.category_id

  const { data: tag, error } = await supabase
    .from('tags')
    .insert(insertData)
    .select('id, name, category_id')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  return tag
})
