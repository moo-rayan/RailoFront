import { apiClient } from "./client"

export interface AppAnnouncement {
  id: number
  version: number
  is_active: boolean
  priority: number
  title_ar: string
  title_en: string
  body_ar: string
  body_en: string
  image_url: string | null
  display_mode: "dialog" | "fullscreen"
  width_ratio: number
  max_height_ratio: number
  image_fit: "cover" | "contain"
  show_action_button: boolean
  action_text_ar: string
  action_text_en: string
  action_url: string
  show_dismiss_button: boolean
  dismiss_text_ar: string
  dismiss_text_en: string
  dismissible: boolean
  start_at: string | null
  end_at: string | null
  created_at: string
  updated_at: string
}

export type AnnouncementInput = Omit<AppAnnouncement, "id" | "created_at" | "updated_at">

export interface AnnouncementList {
  items: AppAnnouncement[]
  total: number
}

export const defaultAnnouncementInput: AnnouncementInput = {
  version: 1,
  is_active: false,
  priority: 0,
  title_ar: "",
  title_en: "",
  body_ar: "",
  body_en: "",
  image_url: null,
  display_mode: "dialog",
  width_ratio: 0.92,
  max_height_ratio: 0.82,
  image_fit: "cover",
  show_action_button: false,
  action_text_ar: "",
  action_text_en: "",
  action_url: "",
  show_dismiss_button: true,
  dismiss_text_ar: "إخفاء",
  dismiss_text_en: "Dismiss",
  dismissible: true,
  start_at: null,
  end_at: null,
}

export const announcementsApi = {
  list: async (): Promise<AnnouncementList> => {
    const { data } = await apiClient.get("/announcements/admin")
    return data
  },

  create: async (input: AnnouncementInput): Promise<AppAnnouncement> => {
    const { data } = await apiClient.post("/announcements/admin", input)
    return data
  },

  update: async (id: number, input: Partial<AnnouncementInput>): Promise<AppAnnouncement> => {
    const { data } = await apiClient.put(`/announcements/admin/${id}`, input)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/announcements/admin/${id}`)
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    const { data } = await apiClient.post("/announcements/admin/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data.url
  },
}
