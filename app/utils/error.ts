/**
 * 格式化后端验证错误信息
 * @param error 错误对象
 * @returns 格式化后的错误消息
 */
export function formatValidationError(error: any): string {
  // 如果错误对象包含 data 字段（Zod 验证错误）
  if (error?.data?.data) {
    const zodError = error.data.data
    const errors: string[] = []

    // 遍历所有字段错误
    for (const [field, fieldError] of Object.entries(zodError)) {
      if (field === '_errors') continue

      const err = fieldError as any
      if (err._errors && Array.isArray(err._errors) && err._errors.length > 0) {
        errors.push(`${err._errors[0]}`)
      }
    }

    if (errors.length > 0) {
      return errors.join('；')
    }
  }

  // 如果有 statusMessage
  if (error?.data?.statusMessage) {
    return error.data.statusMessage
  }

  // 如果有 message
  if (error?.message) {
    return error.message
  }

  // 默认错误消息
  return String(error)
}
