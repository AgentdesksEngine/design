import type { DesignManifest } from './types';

export const catalog: DesignManifest[] = [
  {
    "slug": "crm-v1",
    "title": "Radius CRM Workspace",
    "description": "A committed sample prototype showing how rich app-style HTML designs live in the gallery.",
    "tags": [
      "CRM",
      "Workspace",
      "Prototype"
    ],
    "owner": "Design Team",
    "defaultVersion": "v1",
    "versions": [
      {
        "version": "v1",
        "title": "Initial CRM workspace",
        "notes": "Sample full-page prototype used to validate committed HTML rendering.",
        "entry": "v1/index.html",
        "thumbnail": "v1/thumbnail.svg",
        "createdAt": "2026-09-18T00:00:00.000Z"
      }
    ]
  },
  {
    "slug": "search-tab",
    "title": "Search Tab Concept",
    "description": "A compact search experience sample for validating multiple gallery cards and preview routes.",
    "tags": [
      "Search",
      "Navigation"
    ],
    "owner": "Design Team",
    "defaultVersion": "v1",
    "versions": [
      {
        "version": "v1",
        "title": "Search first layout",
        "notes": "Sample prototype for the shared design catalog.",
        "entry": "v1/index.html",
        "thumbnail": "v1/thumbnail.svg",
        "createdAt": "2026-09-18T00:00:00.000Z"
      }
    ]
  }
];
