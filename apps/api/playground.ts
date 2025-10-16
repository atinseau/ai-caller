import { firstValueFrom, Observable, map, from, tap, mergeMap } from "rxjs"

const sayHello = (): Response => {
  console.log("sayHello called")
  return new Response("Hello, World!")
}
const run1 = (next: () => Observable<Response>) => {
  console.log("run1 before next")
  return next().pipe(
    tap(() => {
      console.log("run1 after next")
    })
  )
}

const run2 = (next: () => Observable<Response>) => {
  console.log("run2 before next")

  throw new Error("Test error in run2")

  return next().pipe(
    tap(() => {
      console.log("run2 after next")
    })
  )
}

const runners = [run1, run2]



// obserable.subscribe()

console.log(await (await firstValueFrom(obserable)).text())
