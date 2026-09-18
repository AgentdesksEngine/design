import type { UpdateStatusResponse } from '../../../shared/types.js';
import { findManifest, parseStatusBody, updateStatus } from '../../_lib/db/designs.js';
import { param, route } from '../../_lib/http.js';
import { requireUser } from '../../_lib/session.js';

export default route({
  PATCH: async (req, res) => {
    const { profileId } = await requireUser(req, res);
    const manifest = findManifest(param(req, 'slug'));
    const status = await updateStatus(manifest, '', parseStatusBody(req.body), profileId);
    res.status(200).json({ ok: true, status } satisfies UpdateStatusResponse);
  },
});
