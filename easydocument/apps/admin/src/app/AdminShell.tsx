import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography
} from "@mui/material";
import { apiBaseUrl, phaseOneAdminModules } from "./config";

export function AdminShell() {
  return (
    <Box minHeight="100vh">
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="h1" flexGrow={1}>
            EasyDocument Admin
          </Typography>
          <Chip label="Phase 1" color="primary" variant="outlined" />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Alert severity="info">
            Admin shell only. Agent mediation, disputes, analytics, reviews, payments, chat, and calls are not implemented in Phase 1.
          </Alert>

          <Box
            display="grid"
            gap={3}
            gridTemplateColumns={{
              xs: "1fr",
              md: "minmax(280px, 360px) 1fr"
            }}
          >
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Admin OTP Login</Typography>
                <Typography variant="body2" color="text.secondary">
                  Use the seeded local admin phone and local mock OTP for development.
                </Typography>
                <TextField label="Phone number" defaultValue="+9779800000001" fullWidth />
                <TextField label="OTP" placeholder="123456" fullWidth />
                <Button variant="contained">Verify Admin</Button>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6">Operational Readiness</Typography>
                  <Typography variant="body2" color="text.secondary">
                    API base URL: {apiBaseUrl}
                  </Typography>
                </Box>
                <Divider />
                <List disablePadding>
                  {phaseOneAdminModules.map((module) => (
                    <ListItem key={module} disablePadding sx={{ py: 0.75 }}>
                      <ListItemText primary={module} />
                      <Chip size="small" label="planned" variant="outlined" />
                    </ListItem>
                  ))}
                </List>
              </Stack>
            </Paper>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
