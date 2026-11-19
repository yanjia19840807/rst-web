export type NextHandlerOption = {
  positionId?: string | null
  name?: string | null
  ccgid?: string | null
}

function usableHandlers(handlers: NextHandlerOption[] | null | undefined) {
  return (handlers ?? []).filter((handler) => Boolean(handler.positionId?.trim()))
}

export function mustChooseHandler(handlers: NextHandlerOption[] | null | undefined) {
  return usableHandlers(handlers).length > 1
}

export function chosenNextPositionId(
  handlers: NextHandlerOption[] | null | undefined,
  selected: string | null | undefined,
) {
  const live = usableHandlers(handlers)
  if (live.length === 1) return live[0]?.positionId?.trim() || null
  if (live.length < 2) return null
  const id = selected?.trim()
  if (!id || !live.some((handler) => handler.positionId === id)) return null
  return id
}
