import { apiClient } from "./client"

export interface NewsArticle {
  id: number
  title: string
  body: string
  image_url: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface NewsList {
  items: NewsArticle[]
  total: number
  page: number
  page_size: number
}

export interface CreateNewsInput {
  title: string
  body?: string
  image_url?: string | null
  is_published?: boolean
}

export interface UpdateNewsInput {
  title?: string
  body?: string
  image_url?: string | null
  is_published?: boolean
}

export const newsApi = {
  list: async (page = 1, pageSize = 20): Promise<NewsList> => {
    const { data } = await apiClient.get("/news/admin", {
      params: { page, page_size: pageSize },
    })
    return data
  },

  create: async (input: CreateNewsInput): Promise<NewsArticle> => {
    const { data } = await apiClient.post("/news/admin", input)
    return data
  },

  update: async (id: number, input: UpdateNewsInput): Promise<NewsArticle> => {
    const { data } = await apiClient.put(`/news/admin/${id}`, input)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/news/admin/${id}`)
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    const { data } = await apiClient.post("/news/admin/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data.url
  },
}
