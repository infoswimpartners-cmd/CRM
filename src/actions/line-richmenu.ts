'use server'

import { revalidatePath } from 'next/cache'
import {
    getRichMenuSettings,
    saveRichMenuSettings,
    linkMemberRichMenuToUser,
    unlinkRichMenuFromUser,
    syncAllActiveMembersRichMenuAction,
} from '@/lib/line-richmenu'

export async function getRichMenuSettingsAction() {
    return await getRichMenuSettings()
}

export async function saveRichMenuSettingsAction(params: {
    memberRichMenuId?: string
    defaultRichMenuId?: string
}) {
    const res = await saveRichMenuSettings(params)
    revalidatePath('/admin/line-marketing')
    return res
}

export async function syncAllActiveMembersRichMenu() {
    const res = await syncAllActiveMembersRichMenuAction()
    revalidatePath('/admin/line-marketing')
    return res
}

export async function linkMemberRichMenuToUserAction(lineUserId: string) {
    const res = await linkMemberRichMenuToUser(lineUserId)
    return res
}

export async function unlinkRichMenuFromUserAction(lineUserId: string) {
    const res = await unlinkRichMenuFromUser(lineUserId)
    return res
}
