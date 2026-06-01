export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const { data, error } = await supabase
    .from('tag_categories')
    .insert({ name: body.name, sort_order: body.sort_order ?? 0 })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  return data
})
