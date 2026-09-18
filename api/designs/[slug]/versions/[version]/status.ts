import type { UpdateStatusResponse } from '../../../../../shared/types.js';
import { findManifest, findVersion, parseStatusBody, updateStatus } from '../../../../_lib/db/designs.js';
import { param, route } from '../../../../_lib/http.js';
import { requireUser } from '../../../../_lib/session.js';

export default route({
  PATCH: async (req, res) => {
    const { profileId } = await requireUser(req, res);
    const manifest = findManifest(param(req, 'slug'));
    const version = param(req, 'version');
    findVersion(manifest, version);
    const status = await updateStatus(manifest, version, parseStatusBody(req.body), profileId);
    res.status(200).json({ ok: true, status } satisfies UpdateStatusResponse);
  },
});
