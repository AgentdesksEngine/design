import { route } from '../_lib/http.js';
import { requireUser } from '../_lib/session.js';
import { listDesigns } from '../_lib/db/designs.js';

export default route({
  GET: async (req, res) => {
    await requireUser(req, res);
    res.status(200).json(await listDesigns());
  },
});
