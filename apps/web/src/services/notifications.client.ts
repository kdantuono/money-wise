/**
 * Notifications Client — Supabase
 *
 * Direct Supabase queries for notification management.
 * RLS policies handle user isolation (user_id = auth.uid()).
 * INSERT is service-only (Edge Functions/triggers create notifications).
 *
 * @module services/notifications.client
 */

import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/utils/supabase/database.types'
import type {
  Notification,
  NotificationQueryParams,
  NotificationListResponse,
  UnreadCountResponse,
} from '@/types/notification.types'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

// =============================================================================
// Error Classes
// =============================================================================

export class NotificationsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'NotificationsApiError'
  }
}

export class AuthenticationError extends NotificationsApiError {
  constructor(message = 'Authentication failed. Please log in again.') {
    super(message, 401, 'AuthenticationError')
    this.name = 'AuthenticationError'
  }
}

export class NotFoundError extends NotificationsApiError {
  constructor(message = 'Notification not found.') {
    super(message, 404, 'NotFoundError')
    this.name = 'NotFoundError'
  }
}

export class ServerError extends NotificationsApiError {
  constructor(message = 'Internal server error. Please try again later.') {
    super(message, 500, 'ServerError')
    this.name = 'ServerError'
  }
}

// =============================================================================
// Row Mapper
// =============================================================================

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as Notification['type'],
    title: row.title,
    message: row.message,
    priority: row.priority as Notification['priority'],
    read: row.status === 'READ',
    dismissed: row.status === 'DISMISSED',
    actionUrl: row.link ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// =============================================================================
// Notifications Client
// =============================================================================

export const notificationsClient = {
  async getNotifications(
    params: NotificationQueryParams = {}
  ): Promise<NotificationListResponse> {
    const supabase = createClient()
    const limit = params.limit ?? 20
    const page = params.page ?? 1
    const offset = (page - 1) * limit

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.read === true) {
      query = query.eq('status', 'READ')
    } else if (params.read === false) {
      query = query.in('status', ['PENDING', 'SENT'])
    }

    const { data, error, count } = await query
    if (error) throw new NotificationsApiError(error.message, 500)

    const total = count ?? 0
    return {
      data: (data ?? []).map(rowToNotification),
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    }
  },

  async getUnreadCount(): Promise<UnreadCountResponse> {
    const supabase = createClient()
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .in('status', ['PENDING', 'SENT'])

    if (error) throw new NotificationsApiError(error.message, 500)
    return { count: count ?? 0 }
  },

  async markAsRead(id: string): Promise<Notification> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .update({ status: 'READ', read_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new NotFoundError()
    return rowToNotification(data)
  },

  async markAllAsRead(): Promise<{ count: number }> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .update({ status: 'READ', read_at: new Date().toISOString() })
      .in('status', ['PENDING', 'SENT'])
      .select()

    if (error) throw new NotificationsApiError(error.message, 500)
    return { count: (data ?? []).length }
  },

  async dismiss(id: string): Promise<Notification> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .update({ status: 'DISMISSED', dismissed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new NotFoundError()
    return rowToNotification(data)
  },
}

export default notificationsClient
