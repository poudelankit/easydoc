import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography
} from "@mui/material";
import type {
  AdminAgentVerificationDetail,
  AdminAgentVerificationSummary,
  AdminCommunicationAuditResponse,
  AdminDashboardResponse,
  AdminDisputeDetail,
  AdminDisputeSummary,
  AdminTaskDetail,
  AdminTaskSummary,
  AdminTaskTimelineResponse,
  DisputeStatus,
  TaskStatus
} from "@easydocument/shared-types";
import { FormEvent, useEffect, useState } from "react";
import {
  BrowserRouter,
  Link as RouterLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams
} from "react-router-dom";
import {
  AdminSession,
  ApiError,
  addMediationNote,
  approveAgent,
  clearStoredSession,
  getAgent,
  getCommunicationAudit,
  getDashboard,
  getDispute,
  getDisputes,
  getPendingAgents,
  getTask,
  getTaskTimeline,
  getTasks,
  loadStoredSession,
  rejectAgent,
  resolveDispute,
  sendOtp,
  storeSession,
  updateDisputeStatus,
  verifyOtp
} from "./adminApi";
import { adminNavigationItems, apiBaseUrl, disputeStatusOptions, taskStatusOptions } from "./config";

export function AdminShell() {
  const [session, setSession] = useState<AdminSession | null>(() => loadStoredSession());

  function handleSession(sessionValue: AdminSession) {
    storeSession(sessionValue);
    setSession(sessionValue);
  }

  function handleLogout() {
    clearStoredSession();
    setSession(null);
  }

  if (!session) {
    return <LoginScreen onAuthenticated={handleSession} />;
  }

  return (
    <BrowserRouter>
      <Box minHeight="100vh">
        <AppBar position="static" color="default" elevation={0}>
          <Toolbar>
            <Typography variant="h6" component="h1" flexGrow={1}>
              EasyDocument Admin
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={session.user.fullName || session.user.phoneNumber} variant="outlined" />
              <Button onClick={handleLogout}>Logout</Button>
            </Stack>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Box
            display="grid"
            gap={3}
            gridTemplateColumns={{ xs: "1fr", md: "240px 1fr" }}
            alignItems="start"
          >
            <Navigation />
            <Routes>
              <Route path="/" element={<Dashboard token={session.accessToken} />} />
              <Route path="/agents" element={<PendingAgents token={session.accessToken} />} />
              <Route path="/agents/:agentId" element={<AgentDetail token={session.accessToken} />} />
              <Route path="/tasks" element={<TaskMonitoring token={session.accessToken} />} />
              <Route path="/tasks/:taskId" element={<TaskDetail token={session.accessToken} />} />
              <Route path="/disputes" element={<DisputeList token={session.accessToken} />} />
              <Route path="/disputes/:disputeId" element={<DisputeDetail token={session.accessToken} />} />
            </Routes>
          </Box>
        </Container>
      </Box>
    </BrowserRouter>
  );
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: (session: AdminSession) => void }) {
  const [phoneNumber, setPhoneNumber] = useState("+9779800000001");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    setLoading(true);
    setError(null);
    try {
      const response = await sendOtp(phoneNumber);
      setDevOtp(response.devOtp ?? null);
    } catch (error) {
      setError(readError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const auth = await verifyOtp(phoneNumber, otp);
      onAuthenticated(auth);
    } catch (error) {
      setError(readError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box minHeight="100vh" display="grid" alignItems="center">
      <Container maxWidth="sm">
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2} component="form" onSubmit={handleVerify}>
            <Box>
              <Typography variant="h5" component="h1">
                EasyDocument Admin
              </Typography>
              <Typography variant="body2" color="text.secondary">
                API: {apiBaseUrl}
              </Typography>
            </Box>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {devOtp ? <Alert severity="success">Local OTP: {devOtp}</Alert> : null}
            <TextField
              label="Phone number"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              fullWidth
            />
            <TextField
              label="OTP"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button type="button" variant="outlined" onClick={handleSendOtp} disabled={loading}>
                Send OTP
              </Button>
              <Button type="submit" variant="contained" disabled={loading || otp.length === 0}>
                Verify Admin
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

function Navigation() {
  return (
    <Paper variant="outlined">
      <List disablePadding>
        {adminNavigationItems.map((item) => (
          <ListItemButton key={item.path} component={RouterLink} to={item.path}>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}

function Dashboard({ token }: { token: string }) {
  const { data, error, loading } = useResource(() => getDashboard(token), [token]);

  if (loading) {
    return <LoadingPanel title="Dashboard" />;
  }
  if (error || !data) {
    return <ErrorPanel title="Dashboard" error={error} />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h5" component="h2">
        Dashboard
      </Typography>
      <Box display="grid" gap={2} gridTemplateColumns={{ xs: "1fr", md: "repeat(3, 1fr)" }}>
        <MetricCard label="Pending agents" value={data.agentVerification.pending} />
        <MetricCard label="Active tasks" value={data.tasks.active} />
        <MetricCard label="Communication rooms" value={data.communication.roomCount} />
      </Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Task Status Counts</Typography>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" gap={1} flexWrap="wrap">
          {data.tasks.byStatus.map((item) => (
            <Chip key={item.status} label={`${item.status}: ${item.count}`} variant="outlined" />
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}

function PendingAgents({ token }: { token: string }) {
  const { data, error, loading, reload } = useResource(() => getPendingAgents(token), [token]);

  if (loading) {
    return <LoadingPanel title="Agent Verification" />;
  }
  if (error || !data) {
    return <ErrorPanel title="Agent Verification" error={error} />;
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" component="h2">
          Agent Verification
        </Typography>
        <Button onClick={reload}>Refresh</Button>
      </Stack>
      <AgentTable agents={data} />
    </Stack>
  );
}

function AgentDetail({ token }: { token: string }) {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const { data, error, loading, setData } = useResource(
    () => (agentId ? getAgent(token, agentId) : Promise.reject(new Error("Missing agent id"))),
    [token, agentId]
  );
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleApprove() {
    if (!agentId) {
      return;
    }
    setActionError(null);
    try {
      setData(await approveAgent(token, agentId));
    } catch (error) {
      setActionError(readError(error));
    }
  }

  async function handleReject() {
    if (!agentId) {
      return;
    }
    setActionError(null);
    try {
      setData(await rejectAgent(token, agentId, reason));
    } catch (error) {
      setActionError(readError(error));
    }
  }

  if (loading) {
    return <LoadingPanel title="Agent Detail" />;
  }
  if (error || !data) {
    return <ErrorPanel title="Agent Detail" error={error} />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" component="h2">
          Agent Detail
        </Typography>
        <Button onClick={() => navigate("/agents")}>Back</Button>
      </Stack>
      {actionError ? <Alert severity="error">{actionError}</Alert> : null}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="h6">{data.user.fullName}</Typography>
          <Typography variant="body2">{data.user.phoneNumber}</Typography>
          <Typography variant="body2">{data.permanentAddressText}</Typography>
          <Stack direction="row" spacing={1}>
            <Chip label={data.status} color={data.status === "VERIFIED" ? "success" : "default"} />
            {data.verification.decision ? <Chip label={data.verification.decision} /> : null}
          </Stack>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Citizenship Metadata</Typography>
        <FileTable files={data.citizenshipFiles} />
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Decision</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" onClick={handleApprove} disabled={data.status === "VERIFIED"}>
              Approve
            </Button>
            <TextField
              label="Rejection reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              fullWidth
            />
            <Button variant="outlined" color="error" onClick={handleReject}>
              Reject
            </Button>
          </Stack>
          {data.verification.reason ? (
            <Alert severity="warning">{data.verification.reason}</Alert>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}

function TaskMonitoring({ token }: { token: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get("status") ?? "") as TaskStatus | "";
  const { data, error, loading, reload } = useResource(() => getTasks(token, status), [token, status]);

  function handleStatusChange(nextStatus: string) {
    setSearchParams(nextStatus ? { status: nextStatus } : {});
  }

  if (loading) {
    return <LoadingPanel title="Task Monitoring" />;
  }
  if (error || !data) {
    return <ErrorPanel title="Task Monitoring" error={error} />;
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} spacing={2}>
        <Typography variant="h5" component="h2" flexGrow={1}>
          Task Monitoring
        </Typography>
        <TextField
          select
          label="Status"
          value={status}
          onChange={(event) => handleStatusChange(event.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">All</MenuItem>
          {taskStatusOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <Button onClick={reload}>Refresh</Button>
      </Stack>
      <TaskTable tasks={data} />
    </Stack>
  );
}

function TaskDetail({ token }: { token: string }) {
  const { taskId } = useParams();
  const taskResource = useResource(
    () => (taskId ? getTask(token, taskId) : Promise.reject(new Error("Missing task id"))),
    [token, taskId]
  );
  const timelineResource = useResource(
    () => (taskId ? getTaskTimeline(token, taskId) : Promise.reject(new Error("Missing task id"))),
    [token, taskId]
  );
  const auditResource = useResource(
    () => (taskId ? getCommunicationAudit(token, taskId) : Promise.reject(new Error("Missing task id"))),
    [token, taskId]
  );

  if (taskResource.loading) {
    return <LoadingPanel title="Task Detail" />;
  }
  if (taskResource.error || !taskResource.data) {
    return <ErrorPanel title="Task Detail" error={taskResource.error} />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h5" component="h2">
        Task Detail
      </Typography>
      <TaskSummaryPanel task={taskResource.data} />
      <TimelinePanel timeline={timelineResource.data} error={timelineResource.error} />
      <CommunicationAuditPanel audit={auditResource.data} error={auditResource.error} />
    </Stack>
  );
}

function DisputeList({ token }: { token: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get("status") ?? "") as DisputeStatus | "";
  const { data, error, loading, reload } = useResource(() => getDisputes(token, status), [token, status]);

  function handleStatusChange(nextStatus: string) {
    setSearchParams(nextStatus ? { status: nextStatus } : {});
  }

  if (loading) {
    return <LoadingPanel title="Disputes" />;
  }
  if (error || !data) {
    return <ErrorPanel title="Disputes" error={error} />;
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} spacing={2}>
        <Typography variant="h5" component="h2" flexGrow={1}>
          Disputes
        </Typography>
        <TextField
          select
          label="Status"
          value={status}
          onChange={(event) => handleStatusChange(event.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">All</MenuItem>
          {disputeStatusOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <Button onClick={reload}>Refresh</Button>
      </Stack>
      <DisputeTable disputes={data} />
    </Stack>
  );
}

function DisputeDetail({ token }: { token: string }) {
  const { disputeId } = useParams();
  const { data, error, loading, setData } = useResource(
    () => (disputeId ? getDispute(token, disputeId) : Promise.reject(new Error("Missing dispute id"))),
    [token, disputeId]
  );
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<DisputeStatus>("UNDER_REVIEW");
  const [statusNote, setStatusNote] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAddNote() {
    if (!disputeId) {
      return;
    }
    setActionError(null);
    try {
      setData(await addMediationNote(token, disputeId, note));
      setNote("");
    } catch (error) {
      setActionError(readError(error));
    }
  }

  async function handleStatusUpdate() {
    if (!disputeId) {
      return;
    }
    setActionError(null);
    try {
      setData(await updateDisputeStatus(token, disputeId, status, statusNote));
      setStatusNote("");
    } catch (error) {
      setActionError(readError(error));
    }
  }

  async function handleResolve() {
    if (!disputeId) {
      return;
    }
    setActionError(null);
    try {
      setData(await resolveDispute(token, disputeId, resolutionSummary));
      setResolutionSummary("");
    } catch (error) {
      setActionError(readError(error));
    }
  }

  if (loading) {
    return <LoadingPanel title="Dispute Detail" />;
  }
  if (error || !data) {
    return <ErrorPanel title="Dispute Detail" error={error} />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" component="h2">
          Dispute Detail
        </Typography>
        <Chip label={data.status} />
      </Stack>
      {actionError ? <Alert severity="error">{actionError}</Alert> : null}
      <DisputeSummaryPanel dispute={data} />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Mediation Notes</Typography>
        <Stack spacing={2} mt={2}>
          <TextField
            label="Internal admin note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <Button variant="contained" onClick={handleAddNote}>
            Add Note
          </Button>
          {data.mediationNotes.map((entry) => (
            <Alert key={entry.id} severity="info">
              {entry.note} - {entry.adminFullName}
            </Alert>
          ))}
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Status Update</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} mt={2}>
          <TextField
            select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value as DisputeStatus)}
            sx={{ minWidth: 260 }}
          >
            {disputeStatusOptions
              .filter((option) => option !== "RESOLVED")
              .map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            label="Status note"
            value={statusNote}
            onChange={(event) => setStatusNote(event.target.value)}
            fullWidth
          />
          <Button variant="outlined" onClick={handleStatusUpdate}>
            Update
          </Button>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Resolution</Typography>
        <Stack spacing={2} mt={2}>
          <TextField
            label="Resolution summary"
            value={resolutionSummary}
            onChange={(event) => setResolutionSummary(event.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <Button variant="contained" color="success" onClick={handleResolve}>
            Resolve
          </Button>
          {data.resolutionSummary ? <Alert severity="success">{data.resolutionSummary}</Alert> : null}
        </Stack>
      </Paper>
      <DisputeHistoryPanel dispute={data} />
      <TimelinePanel timeline={{ taskId: data.task.id, currentStatus: data.task.status, expectedCompletionDate: null, events: data.taskTimeline }} error={null} />
      <CommunicationAuditPanel audit={data.communicationAudit} error={null} />
    </Stack>
  );
}

function DisputeTable({ disputes }: { disputes: AdminDisputeSummary[] }) {
  return (
    <Paper variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Dispute</TableCell>
            <TableCell>Task</TableCell>
            <TableCell>Opened By</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {disputes.map((dispute) => (
            <TableRow key={dispute.id}>
              <TableCell>
                <Typography variant="body2">{dispute.reason}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {dispute.createdAt}
                </Typography>
              </TableCell>
              <TableCell>{dispute.task.taskName}</TableCell>
              <TableCell>{dispute.openedBy.fullName} ({dispute.openedBy.role})</TableCell>
              <TableCell>
                <Chip label={dispute.status} size="small" />
              </TableCell>
              <TableCell align="right">
                <Button component={RouterLink} to={`/disputes/${dispute.id}`} size="small">
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

function DisputeSummaryPanel({ dispute }: { dispute: AdminDisputeDetail }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Typography variant="h6">{dispute.reason}</Typography>
        <Typography variant="body2">{dispute.description}</Typography>
        <Divider />
        <Typography variant="body2">Task: {dispute.task.taskName} ({dispute.task.status})</Typography>
        <Typography variant="body2">Customer: {dispute.customer.fullName} ({dispute.customer.phoneNumber})</Typography>
        <Typography variant="body2">Agent: {dispute.agent.fullName} ({dispute.agent.phoneNumber})</Typography>
        <Typography variant="body2">Opened by: {dispute.openedBy.fullName} ({dispute.openedBy.role})</Typography>
      </Stack>
    </Paper>
  );
}

function DisputeHistoryPanel({ dispute }: { dispute: AdminDisputeDetail }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6">Dispute Status History</Typography>
      <List dense>
        {dispute.statusHistory.map((event) => (
          <ListItemText
            key={event.id}
            primary={`${event.oldStatus ?? "NEW"} -> ${event.newStatus}`}
            secondary={`${event.actor.fullName} (${event.actor.role})${event.note ? ` - ${event.note}` : ""}`}
          />
        ))}
      </List>
    </Paper>
  );
}

function AgentTable({ agents }: { agents: AdminAgentVerificationSummary[] }) {
  return (
    <Paper variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Agent</TableCell>
            <TableCell>Citizenship</TableCell>
            <TableCell>Permanent Address</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell>
                <Typography variant="body2">{agent.user.fullName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {agent.user.phoneNumber}
                </Typography>
              </TableCell>
              <TableCell>{agent.citizenshipNumber}</TableCell>
              <TableCell>{agent.permanentAddressText}</TableCell>
              <TableCell>
                <Chip label={agent.status} size="small" />
              </TableCell>
              <TableCell align="right">
                <Button component={RouterLink} to={`/agents/${agent.id}`} size="small">
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

function FileTable({ files }: { files: AdminAgentVerificationDetail["citizenshipFiles"] }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Kind</TableCell>
          <TableCell>Object Key</TableCell>
          <TableCell>MIME</TableCell>
          <TableCell>Size</TableCell>
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {files.map((file) => (
          <TableRow key={file.fileId}>
            <TableCell>{file.kind}</TableCell>
            <TableCell>{file.objectKey}</TableCell>
            <TableCell>{file.mimeType}</TableCell>
            <TableCell>{file.sizeBytes}</TableCell>
            <TableCell>{file.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TaskTable({ tasks }: { tasks: AdminTaskSummary[] }) {
  return (
    <Paper variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Task</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Agent</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <Typography variant="body2">{task.taskName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {task.organizationName}
                </Typography>
              </TableCell>
              <TableCell>{task.customer.fullName}</TableCell>
              <TableCell>{task.assignedAgent?.fullName ?? "Unassigned"}</TableCell>
              <TableCell>
                <Chip label={task.status} size="small" />
              </TableCell>
              <TableCell align="right">
                <Button component={RouterLink} to={`/tasks/${task.id}`} size="small">
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

function TaskSummaryPanel({ task }: { task: AdminTaskDetail }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6">{task.taskName}</Typography>
          <Chip label={task.status} size="small" />
        </Stack>
        <Typography variant="body2">{task.requestDescription}</Typography>
        <Divider />
        <Typography variant="body2">Customer: {task.customer.fullName} ({task.customer.phoneNumber})</Typography>
        <Typography variant="body2">
          Agent: {task.assignedAgent ? `${task.assignedAgent.fullName} (${task.assignedAgent.phoneNumber})` : "Unassigned"}
        </Typography>
        <Typography variant="body2">Organization: {task.organizationName}, {task.organizationAddress}</Typography>
      </Stack>
    </Paper>
  );
}

function TimelinePanel({
  timeline,
  error
}: {
  timeline?: AdminTaskTimelineResponse;
  error: string | null;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6">Task Timeline</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <List dense>
        {timeline?.events.map((event) => (
          <ListItemText
            key={event.id}
            primary={`${event.toStatus} by ${event.actor.fullName}`}
            secondary={`${event.createdAt ?? ""}${event.note ? ` - ${event.note}` : ""}`}
          />
        ))}
      </List>
    </Paper>
  );
}

function CommunicationAuditPanel({
  audit,
  error
}: {
  audit?: AdminCommunicationAuditResponse;
  error: string | null;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6">Communication Audit</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {audit ? (
        <Box display="grid" gap={2} gridTemplateColumns={{ xs: "1fr", md: "repeat(4, 1fr)" }} mt={2}>
          <MetricCard label="Room" value={audit.roomExists ? "Exists" : "Missing"} />
          <MetricCard label="Messages" value={audit.messageCount} />
          <MetricCard label="Attachments" value={audit.attachmentCount} />
          <MetricCard label="Calls" value={audit.callCount} />
        </Box>
      ) : null}
      {audit ? (
        <Typography variant="body2" color="text.secondary" mt={2}>
          Last activity: {audit.lastActivityAt ?? "None"}; raw message body visible: {String(audit.rawMessageBodyVisible)}
        </Typography>
      ) : null}
    </Paper>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5">{value}</Typography>
    </Paper>
  );
}

function LoadingPanel({ title }: { title: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <CircularProgress size={20} />
        <Typography>{title}</Typography>
      </Stack>
    </Paper>
  );
}

function ErrorPanel({ title, error }: { title: string; error: string | null }) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6">{title}</Typography>
        <Alert severity="error">{error ?? "Unable to load data"}</Alert>
      </Stack>
    </Paper>
  );
}

function useResource<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);

  function reload() {
    setReloadVersion((version) => version + 1);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    loader()
      .then((nextData) => {
        if (active) {
          setData(nextData);
        }
      })
      .catch((error) => {
        if (active) {
          setError(readError(error));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [...deps, reloadVersion]);

  return { data, error, loading, reload, setData };
}

function readError(error: unknown) {
  if (error instanceof ApiError) {
    return `${error.message} (${error.status})`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error";
}
