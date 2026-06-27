import { eveChannel } from "eve/channels/eve";
import { none } from "eve/channels/auth";

// Public demo: anyone can call the agent from the browser. Add real auth
// (e.g. vercelOidc/localDev or your own session check) before exposing
// anything sensitive.
export default eveChannel({ auth: [none()] });
