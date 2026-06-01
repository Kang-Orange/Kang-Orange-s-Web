export default defineEventHandler(async () => {
  const supabase = getSupabase()

  const { data: tags, error } = await supabase
    .from('tags')
    .select('name, category_id ( name )')
    .order('name')

  if (error) throw createError({ statusCode: 500, message: error.message })

  return tags.map((t: any) => ({
    name: t.name,
    category: t.category_id?.name ?? null
  }))
})
