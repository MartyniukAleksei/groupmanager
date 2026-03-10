from datetime import datetime
from pydantic import BaseModel, ConfigDict


class GroupCreate(BaseModel):
    name: str
    description: str | None = None


class JoinGroupRequest(BaseModel):
    join_code: str


class GroupOut(BaseModel):
    id: int
    name: str
    join_code: str
    description: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class GroupWithRoleOut(GroupOut):
    role: str
    member_count: int
