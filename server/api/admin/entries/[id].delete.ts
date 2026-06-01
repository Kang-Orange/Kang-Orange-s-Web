export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const id = getRouterParam(event, 'id')

  // Fetch cover_url before deleting so we can clean up Storage
  const { data: entry } = await supabase
    .from('entries')
    .select('cover_url')
    .eq('id', id)
    .single()

  // Delete cover file from Storage if it's a Supabase-managed file
  if (entry?.cover_url) {
    const match = entry.cover_url.match(/\/storage\/v1\/object\/public\/covers\/(.+)/)
    if (match) {
      await supabase.storage.from('covers').remove([match[1]])
    }
  }

  // Clean up junction records first
  await supabase.from('entry_tags').delete().eq('entry_id', id)

  const { error } = await supabase.from('entries').delete().eq('id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { success: true }
})
