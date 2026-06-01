export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()

  const { data: entries, error } = await supabase
    .from('entries')
    .select('*, entry_tags ( tags ( name ) )')
    .order('release_date', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return entries.map((entry: any) => ({
    ...entry,
    tags: entry.entry_tags.map((et: any) => et.tags.name)
  }))
})
