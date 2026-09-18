import { getDesign } from '../../_lib/db/designs.js';
import { param, route } from '../../_lib/http.js';
import { requireUser } from '../../_lib/session.js';

export default route({
  GET: async (req, res) => {
    await requireUser(req, res);
    res.status(200).json(await getDesign(param(req, 'slug')));
  },
});
