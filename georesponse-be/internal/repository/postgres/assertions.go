/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Compile-time checks that each PostgreSQL implementation in

	this package actually satisfies the domain repository interface it
	is meant to implement.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package postgres

import (
	"github.com/mahardika-pratama/georesponse-be/internal/audit"
	"github.com/mahardika-pratama/georesponse-be/internal/auth"
	"github.com/mahardika-pratama/georesponse-be/internal/authorization"
	"github.com/mahardika-pratama/georesponse-be/internal/resource"
	"github.com/mahardika-pratama/georesponse-be/internal/resourcehistory"
)

var (
	_ resource.Repository                = (*ResourceRepository)(nil)
	_ resourcehistory.Repository         = (*ResourceHistoryRepository)(nil)
	_ audit.Repository                   = (*AuditRepository)(nil)
	_ auth.Repository                    = (*UserRepository)(nil)
	_ authorization.RoleRepository       = (*RoleRepository)(nil)
	_ authorization.PermissionRepository = (*PermissionRepository)(nil)
)
