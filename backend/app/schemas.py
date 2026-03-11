from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


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


class ScheduleItemIn(BaseModel):
    type: str
    name: str
    teacher: str = ""
    room: str = ""
    link: str = ""


class ScheduleEntryCreate(BaseModel):
    day: str
    time: str
    week: str  # 'both' | '1' | '2' | 'once'
    is_one_time: bool = False
    class_format: str = "standard"
    items: list[ScheduleItemIn]


class ScheduleEntryUpdate(BaseModel):
    day: Optional[str] = None
    time: Optional[str] = None
    week: Optional[str] = None
    is_one_time: Optional[bool] = None
    class_format: Optional[str] = None
    items: Optional[list[ScheduleItemIn]] = None


class ScheduleEntryOut(BaseModel):
    id: int
    group_id: int
    day: str
    time: str
    week: str
    is_one_time: bool
    class_format: str
    items: list
    model_config = ConfigDict(from_attributes=True)


class ScheduleResponse(BaseModel):
    entries: list[ScheduleEntryOut]
    current_week: int


class SetWeekRequest(BaseModel):
    current_week: int


class AttendanceVoterOut(BaseModel):
    id: int
    name: str


class AttendanceSessionOut(BaseModel):
    id: int
    subject_name: str
    items: list
    time: str
    date: str
    user_vote: str | None
    online: list[AttendanceVoterOut]
    offline: list[AttendanceVoterOut]
    absent: list[AttendanceVoterOut]


class AttendanceDayResponse(BaseModel):
    sessions: list[AttendanceSessionOut]
    can_vote: bool


class CastVoteRequest(BaseModel):
    vote_type: str | None


class HomeworkSubjectOut(BaseModel):
    schedule_entry_id: int | None
    subject_name: str
    day: str
    text: str


class HomeworkWeekResponse(BaseModel):
    week_start: str
    week_type: int
    is_admin: bool
    entries: list[HomeworkSubjectOut]


class HomeworkSaveRequest(BaseModel):
    week_start: str
    day: str
    subject_name: str
    schedule_entry_id: int | None
    text: str


class MaterialLinkOut(BaseModel):
    id: int
    title: str
    url: str
    model_config = ConfigDict(from_attributes=True)


class MaterialFolderOut(BaseModel):
    id: int
    subject_name: str
    name: str
    links: list[MaterialLinkOut]
    model_config = ConfigDict(from_attributes=True)


class MaterialsResponse(BaseModel):
    subjects: list[str]
    folders: list[MaterialFolderOut]
    is_admin: bool


class CreateFolderRequest(BaseModel):
    subject_name: str
    name: str


class CreateLinkRequest(BaseModel):
    title: str
    url: str


class QueueEntryOut(BaseModel):
    user_id: int
    name: str


class QueueStateResponse(BaseModel):
    subjects: list[str]
    is_admin: bool
    full: list[QueueEntryOut]
    group1: list[QueueEntryOut]
    group2: list[QueueEntryOut]
    my_queues: list[str]


class JoinQueueRequest(BaseModel):
    subject_name: str
    queue_type: str


class ClearQueueRequest(BaseModel):
    subject_name: str
    queue_type: str


class UsefulLinkCreate(BaseModel):
    title: str
    url: str
    emoji: str


class UsefulLinkOut(BaseModel):
    id: int
    title: str
    url: str
    emoji: str
    model_config = ConfigDict(from_attributes=True)


class UserProfileOut(BaseModel):
    id: int
    email: str
    name: str
    avatar_url: str | None
    telegram: str | None
    birthday: str | None
    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    name: str | None = None
    telegram: str | None = None
    birthday: str | None = None


class MemberOut(BaseModel):
    user_id: int
    name: str
    email: str
    avatar_url: str | None
    telegram: str | None
    birthday: str | None
    role: str
    joined_at: str
    model_config = ConfigDict(from_attributes=True)


class UpdateRoleRequest(BaseModel):
    role: str
