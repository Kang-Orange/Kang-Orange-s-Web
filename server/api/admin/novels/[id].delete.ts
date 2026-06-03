export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const id = getRouterParam(event, 'id')

  // Fetch cover_url before deleting so we can clean up Storage
  const { data: novel } = await supabase
    .from('novels')
    .select('cover_url')
    .eq('id', id)
    .single()

  // Delete cover file from Storage if it's a Supabase-managed file
  if (novel?.cover_url) {
    const match = novel.cover_url.match(/\/storage\/v1\/object\/public\/covers\/(.+)/)
    if (match) {
      await supabase.storage.from('covers').remove([match[1]])
    }
  }

  // Clean up junction records first (CASCADE handles this, but explicit for clarity)
  await supabase.from('novel_tags').delete().eq('novel_id', id)
  await supabase.from('novel_author_links').delete().eq('novel_id', id)

  const { error } = await supabase.from('novels').delete().eq('id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { success: true }
})
