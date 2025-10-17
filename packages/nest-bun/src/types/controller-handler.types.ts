import type { BunRequest } from "bun";
import type { Observable } from "rxjs";


export type ControllerHandler = (req: BunRequest) =>
  | Response
  | Promise<Response>
  | Observable<Response>
  | Promise<Observable<Response>>
