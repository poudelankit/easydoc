import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'app_environment.dart';
import 'demo_api_client.dart';
import 'demo_backend_widgets.dart';

void main() {
  validateMobileEnvironment(AppEnvironment.current);
  runApp(const EasyDocumentMobileApp());
}

class EasyDocumentMobileApp extends StatelessWidget {
  const EasyDocumentMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    const environment = AppEnvironment.current;

    return MaterialApp(
      title: 'EasyDocument',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2457A7),
          secondary: const Color(0xFF009B72),
        ),
        useMaterial3: true,
      ),
      home: PhaseOneShell(
        api: DemoApiClient(environment: environment),
      ),
    );
  }
}

class PhaseOneShell extends StatefulWidget {
  const PhaseOneShell({
    required this.api,
    super.key,
  });

  final DemoApiClient api;

  @override
  State<PhaseOneShell> createState() => _PhaseOneShellState();
}

class _PhaseOneShellState extends State<PhaseOneShell> {
  int _tabIndex = 0;
  DemoSession? _session;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      DemoOtpScreen(
        api: widget.api,
        session: _session,
        onSessionChanged: _setSession,
      ),
      DemoCustomerAccountScreen(session: _session),
      DemoAgentAccountScreen(session: _session),
      DemoCustomerTasksScreen(
        api: widget.api,
        session: _session,
      ),
      DemoAgentTasksScreen(
        api: widget.api,
        session: _session,
      ),
      DemoNotificationsScreen(
        api: widget.api,
        session: _session,
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('EasyDocument'),
      ),
      body: SafeArea(
        child: IndexedStack(
          index: _tabIndex,
          children: pages,
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (index) => setState(() => _tabIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.phone_android_outlined),
            selectedIcon: Icon(Icons.phone_android),
            label: 'OTP',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Customer',
          ),
          NavigationDestination(
            icon: Icon(Icons.badge_outlined),
            selectedIcon: Icon(Icons.badge),
            label: 'Agent',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Tasks',
          ),
          NavigationDestination(
            icon: Icon(Icons.travel_explore_outlined),
            selectedIcon: Icon(Icons.travel_explore),
            label: 'Agent Work',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: 'Alerts',
          ),
        ],
      ),
    );
  }

  Future<void> _restoreSession() async {
    final restored = await widget.api.restoreSession();
    if (!mounted) {
      return;
    }
    setState(() => _session = restored);
  }

  void _setSession(DemoSession? session) {
    setState(() => _session = session);
  }
}

class OtpShellScreen extends StatelessWidget {
  const OtpShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ShellPane(
      title: 'Phone OTP',
      description:
          'Request and verify a Nepal mobile OTP before customer or agent registration.',
      children: [
        TextField(
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            labelText: 'Phone number',
            hintText: '+9779800000000',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 12),
        TextField(
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'OTP',
            hintText: '123456 in local mock',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 16),
        _ButtonRow(
          primaryLabel: 'Verify',
          secondaryLabel: 'Send OTP',
        ),
      ],
    );
  }
}

class CustomerProfileShellScreen extends StatelessWidget {
  const CustomerProfileShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ShellPane(
      title: 'Customer Registration',
      description: 'Capture full name and address after phone verification.',
      children: [
        TextField(
          decoration: InputDecoration(
            labelText: 'Full name',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 12),
        TextField(
          minLines: 2,
          maxLines: 4,
          decoration: InputDecoration(
            labelText: 'Address',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 16),
        _ButtonRow(
          primaryLabel: 'Save Profile',
          secondaryLabel: 'Load Me',
        ),
      ],
    );
  }
}

class AgentKycShellScreen extends StatelessWidget {
  const AgentKycShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ShellPane(
      title: 'Agent KYC',
      description:
          'Collect identity, citizenship placeholders, permanent address, and permanent location.',
      children: [
        TextField(
          decoration: InputDecoration(
            labelText: 'Legal full name',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 12),
        TextField(
          decoration: InputDecoration(
            labelText: 'Citizenship number',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 12),
        TextField(
          decoration: InputDecoration(
            labelText: 'Permanent address',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: TextField(
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Latitude',
                  border: OutlineInputBorder(),
                ),
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: TextField(
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Longitude',
                  border: OutlineInputBorder(),
                ),
              ),
            ),
          ],
        ),
        SizedBox(height: 16),
        _PlaceholderList(),
        SizedBox(height: 16),
        _ButtonRow(
          primaryLabel: 'Submit KYC',
          secondaryLabel: 'Create Placeholders',
        ),
      ],
    );
  }
}

class CustomerTaskShellScreen extends StatelessWidget {
  const CustomerTaskShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ShellPane(
      title: 'Customer Tasks',
      description:
          'Create a document service request and review the accepted agent details.',
      children: [
        CustomerCreateTaskScreen(),
        SizedBox(height: 24),
        CustomerTaskDetailScreen(),
        SizedBox(height: 24),
        CustomerTaskTimelineScreen(),
        SizedBox(height: 24),
        LeaveReviewScreen(),
        SizedBox(height: 24),
        TaskDisputeScreen(),
        SizedBox(height: 24),
        TaskCallControlsScreen(),
        SizedBox(height: 24),
        TaskChatScreen(),
      ],
    );
  }
}

class CustomerCreateTaskScreen extends StatelessWidget {
  const CustomerCreateTaskScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _TaskPanel(
      title: 'Create Task',
      children: [
        TextField(
          decoration: InputDecoration(
            labelText: 'Document type',
            hintText: 'Citizenship',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 12),
        TextField(
          decoration: InputDecoration(
            labelText: 'Organization name',
            hintText: 'CDAO',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 12),
        TextField(
          minLines: 2,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: 'Organization address',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: TextField(
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Latitude',
                  border: OutlineInputBorder(),
                ),
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: TextField(
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Longitude',
                  border: OutlineInputBorder(),
                ),
              ),
            ),
          ],
        ),
        SizedBox(height: 12),
        TextField(
          minLines: 3,
          maxLines: 5,
          decoration: InputDecoration(
            labelText: 'Request description',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 16),
        _StatusChip(label: 'Supporting document placeholder'),
        SizedBox(height: 16),
        _ButtonRow(
          primaryLabel: 'Create Task',
          secondaryLabel: 'Add Placeholder',
        ),
      ],
    );
  }
}

class CustomerTaskDetailScreen extends StatelessWidget {
  const CustomerTaskDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _TaskPanel(
      title: 'Task Detail',
      children: [
        _ReadonlyLine(
            label: 'Task name', value: 'SITA CUSTOMER-CITIZENSHIP-CDAO'),
        _ReadonlyLine(
            label: 'Status',
            value: 'ACCEPTED, DEAL_CONFIRMED, IN_PROGRESS, or later'),
        _ReadonlyLine(label: 'Assigned agent', value: 'Shown after acceptance'),
        _ReadonlyLine(label: 'Agent phone', value: 'Shown after acceptance'),
        ExpectedDeliveryDateDisplay(),
        SizedBox(height: 12),
        _ButtonRow(
          primaryLabel: 'Confirm Deal',
          secondaryLabel: 'Open Chat',
        ),
      ],
    );
  }
}

class CustomerTaskTimelineScreen extends StatelessWidget {
  const CustomerTaskTimelineScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _TaskPanel(
      title: 'Task Timeline',
      children: [
        _TimelineStep(
            status: 'ACCEPTED',
            actor: 'Agent',
            note: 'Agent accepted the request'),
        _TimelineStep(
            status: 'DEAL_CONFIRMED',
            actor: 'Customer',
            note: 'Customer started the deal'),
        _TimelineStep(
            status: 'IN_PROGRESS',
            actor: 'Agent',
            note: 'Agent began office work'),
        _TimelineStep(
            status: 'READY_FOR_DELIVERY',
            actor: 'Agent',
            note: 'Document ready for handoff'),
        SizedBox(height: 12),
        CompleteTaskButtonPlaceholder(),
      ],
    );
  }
}

class AgentTaskShellScreen extends StatelessWidget {
  const AgentTaskShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ShellPane(
      title: 'Agent Tasks',
      description:
          'Review nearby customer requests and inspect accepted task details.',
      children: [
        AgentNearbyRequestsScreen(),
        SizedBox(height: 24),
        AgentAcceptedTaskDetailScreen(),
        SizedBox(height: 24),
        AgentProgressUpdateScreen(),
        SizedBox(height: 24),
        AgentReviewsScreen(),
        SizedBox(height: 24),
        TaskDisputeScreen(),
        SizedBox(height: 24),
        TaskCallControlsScreen(),
        SizedBox(height: 24),
        TaskChatScreen(),
      ],
    );
  }
}

class AgentNearbyRequestsScreen extends StatelessWidget {
  const AgentNearbyRequestsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _TaskPanel(
      title: 'Nearby Requests',
      children: [
        _ReadonlyLine(label: 'Document', value: 'Citizenship'),
        _ReadonlyLine(label: 'Organization', value: 'CDAO'),
        _ReadonlyLine(label: 'Distance', value: 'Nearest first'),
        SizedBox(height: 12),
        _ButtonRow(
          primaryLabel: 'Accept',
          secondaryLabel: 'Refresh Nearby',
        ),
      ],
    );
  }
}

class AgentAcceptedTaskDetailScreen extends StatelessWidget {
  const AgentAcceptedTaskDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _TaskPanel(
      title: 'Accepted Task Detail',
      children: [
        _ReadonlyLine(label: 'Customer', value: 'Shown after acceptance'),
        _ReadonlyLine(label: 'Customer phone', value: 'Shown after acceptance'),
        _ReadonlyLine(
            label: 'Task status',
            value: 'DEAL_CONFIRMED or active progress status'),
        _ReadonlyLine(
            label: 'Organization address', value: 'Babarmahal, Kathmandu'),
        ExpectedDeliveryDateDisplay(),
        SizedBox(height: 12),
        _ButtonRow(
          primaryLabel: 'Set Expected Date',
          secondaryLabel: 'Open Chat',
        ),
      ],
    );
  }
}

class AgentProgressUpdateScreen extends StatelessWidget {
  const AgentProgressUpdateScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _TaskPanel(
      title: 'Progress Update',
      children: [
        TextField(
          decoration: InputDecoration(
            labelText: 'Expected completion date',
            hintText: '2026-07-10',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 12),
        TextField(
          minLines: 2,
          maxLines: 4,
          decoration: InputDecoration(
            labelText: 'Progress note',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _StatusChip(label: 'IN_PROGRESS'),
            _StatusChip(label: 'DOCUMENT_REQUESTED'),
            _StatusChip(label: 'VISITED_ORGANIZATION'),
            _StatusChip(label: 'DOCUMENT_COLLECTED'),
            _StatusChip(label: 'READY_FOR_DELIVERY'),
            _StatusChip(label: 'DELIVERED'),
          ],
        ),
        SizedBox(height: 16),
        _ButtonRow(
          primaryLabel: 'Update Status',
          secondaryLabel: 'Save Date',
        ),
      ],
    );
  }
}

class ExpectedDeliveryDateDisplay extends StatelessWidget {
  const ExpectedDeliveryDateDisplay({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ReadonlyLine(
        label: 'Expected delivery', value: 'Set by assigned agent');
  }
}

class CompleteTaskButtonPlaceholder extends StatelessWidget {
  const CompleteTaskButtonPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: null,
      icon: const Icon(Icons.task_alt),
      label: const Text('Complete Task'),
    );
  }
}

class LeaveReviewScreen extends StatelessWidget {
  const LeaveReviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _TaskPanel(
      title: 'Leave Review',
      children: [
        _ReadonlyLine(
            label: 'Availability', value: 'Enabled after task completion'),
        RatingSelector(label: 'Overall'),
        SizedBox(height: 10),
        RatingSelector(label: 'Communication'),
        SizedBox(height: 10),
        RatingSelector(label: 'Timeliness'),
        SizedBox(height: 10),
        RatingSelector(label: 'Professionalism'),
        SizedBox(height: 12),
        ReviewTextField(),
        SizedBox(height: 16),
        _ButtonRow(
          primaryLabel: 'Submit Review',
          secondaryLabel: 'View My Reviews',
        ),
      ],
    );
  }
}

class RatingSelector extends StatelessWidget {
  const RatingSelector({
    required this.label,
    super.key,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 128,
          child: Text(label, style: Theme.of(context).textTheme.labelLarge),
        ),
        const Expanded(
          child: Wrap(
            spacing: 4,
            children: [
              Icon(Icons.star, size: 22),
              Icon(Icons.star, size: 22),
              Icon(Icons.star, size: 22),
              Icon(Icons.star_half, size: 22),
              Icon(Icons.star_border, size: 22),
            ],
          ),
        ),
      ],
    );
  }
}

class ReviewTextField extends StatelessWidget {
  const ReviewTextField({super.key});

  @override
  Widget build(BuildContext context) {
    return const TextField(
      minLines: 3,
      maxLines: 5,
      decoration: InputDecoration(
        labelText: 'Review text',
        border: OutlineInputBorder(),
      ),
    );
  }
}

class AgentReviewsScreen extends StatelessWidget {
  const AgentReviewsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _TaskPanel(
      title: 'Agent Reviews',
      children: [
        _ReadonlyLine(label: 'Average rating', value: '4.7 overall'),
        _ReadonlyLine(
            label: 'Completed tasks', value: 'Shown from reputation summary'),
        _ReadonlyLine(
            label: 'Total reviews', value: 'Shown from reputation summary'),
        SizedBox(height: 8),
        _ReviewSummaryLine(
          rating: '5',
          text: 'Clear communication and careful document handling.',
        ),
        _ReviewSummaryLine(
          rating: '4',
          text: 'Delivered on time with helpful updates.',
        ),
      ],
    );
  }
}

class NotificationShellScreen extends StatelessWidget {
  const NotificationShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ShellPane(
      title: 'Notifications',
      description:
          'Review task, message, call, dispute, verification, and review updates.',
      children: [
        NotificationBadgePlaceholder(),
        SizedBox(height: 16),
        NotificationListPlaceholder(),
        SizedBox(height: 16),
        _ButtonRow(
          primaryLabel: 'Mark All Read',
          secondaryLabel: 'Refresh',
        ),
      ],
    );
  }
}

class NotificationBadgePlaceholder extends StatelessWidget {
  const NotificationBadgePlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Badge(
          label: Text('3'),
          child: Icon(Icons.notifications_active_outlined, size: 32),
        ),
        SizedBox(width: 16),
        Expanded(
          child: _ReadonlyLine(label: 'Unread', value: '3 notifications'),
        ),
      ],
    );
  }
}

class NotificationListPlaceholder extends StatelessWidget {
  const NotificationListPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        NotificationTilePlaceholder(
          title: 'Task accepted',
          body: 'An agent accepted your document request.',
          unread: true,
        ),
        NotificationTilePlaceholder(
          title: 'New message',
          body: 'Your task has a new message.',
          unread: true,
        ),
        NotificationTilePlaceholder(
          title: 'Review received',
          body: 'A customer submitted a review.',
          unread: false,
        ),
      ],
    );
  }
}

class NotificationTilePlaceholder extends StatelessWidget {
  const NotificationTilePlaceholder({
    required this.title,
    required this.body,
    required this.unread,
    super.key,
  });

  final String title;
  final String body;
  final bool unread;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: unread
              ? Theme.of(context).colorScheme.primaryContainer
              : Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
        ),
        child: ListTile(
          leading:
              Icon(unread ? Icons.markunread_outlined : Icons.drafts_outlined),
          title: Text(title),
          subtitle: Text(body),
          trailing: const IconButton(
            onPressed: null,
            tooltip: 'Mark as read placeholder',
            icon: Icon(Icons.done_all_outlined),
          ),
        ),
      ),
    );
  }
}

class _ReviewSummaryLine extends StatelessWidget {
  const _ReviewSummaryLine({
    required this.rating,
    required this.text,
  });

  final String rating;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Chip(
            avatar: const Icon(Icons.star, size: 18),
            label: Text(rating),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

class TaskDisputeScreen extends StatelessWidget {
  const TaskDisputeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _TaskPanel(
      title: 'Task Dispute',
      children: [
        OpenDisputePlaceholder(),
        SizedBox(height: 12),
        DisputeStatusPlaceholder(),
        SizedBox(height: 12),
        ResolutionSummaryPlaceholder(),
      ],
    );
  }
}

class OpenDisputePlaceholder extends StatelessWidget {
  const OpenDisputePlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          decoration: InputDecoration(
            labelText: 'Dispute reason',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 12),
        TextField(
          minLines: 3,
          maxLines: 5,
          decoration: InputDecoration(
            labelText: 'Dispute description',
            border: OutlineInputBorder(),
          ),
        ),
        SizedBox(height: 12),
        _ButtonRow(
          primaryLabel: 'Open Dispute',
          secondaryLabel: 'View Status',
        ),
      ],
    );
  }
}

class DisputeStatusPlaceholder extends StatelessWidget {
  const DisputeStatusPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _ReadonlyLine(
            label: 'Status',
            value: 'OPEN, UNDER_REVIEW, ACTION_REQUIRED, or RESOLVED'),
        _ReadonlyLine(label: 'Opened by', value: 'Customer or assigned agent'),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _StatusChip(label: 'OPEN'),
            _StatusChip(label: 'UNDER_REVIEW'),
            _StatusChip(label: 'CUSTOMER_ACTION_REQUIRED'),
            _StatusChip(label: 'AGENT_ACTION_REQUIRED'),
          ],
        ),
      ],
    );
  }
}

class ResolutionSummaryPlaceholder extends StatelessWidget {
  const ResolutionSummaryPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ReadonlyLine(
      label: 'Resolution',
      value: 'Visible after admin resolves the dispute',
    );
  }
}

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    required this.status,
    required this.actor,
    required this.note,
  });

  final String status;
  final String actor;
  final String note;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.radio_button_checked, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(status, style: Theme.of(context).textTheme.labelLarge),
                Text('$actor - $note'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class TaskCallControlsScreen extends StatelessWidget {
  const TaskCallControlsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _TaskPanel(
      title: 'Task Calls',
      children: [
        _ReadonlyLine(
            label: 'Access', value: 'Customer and assigned agent only'),
        _ReadonlyLine(
            label: 'Signaling',
            value: 'Socket.IO WebRTC offer, answer, and ICE events'),
        SizedBox(height: 8),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            AudioCallButtonPlaceholder(),
            VideoCallButtonPlaceholder(),
            ExternalPhoneCallButtonPlaceholder(phoneNumber: '+9779800000000'),
          ],
        ),
        SizedBox(height: 16),
        IncomingCallPlaceholder(),
        SizedBox(height: 12),
        ActiveCallPlaceholder(),
      ],
    );
  }
}

class AudioCallButtonPlaceholder extends StatelessWidget {
  const AudioCallButtonPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: () {},
      icon: const Icon(Icons.call_outlined),
      label: const Text('Audio Call'),
    );
  }
}

class VideoCallButtonPlaceholder extends StatelessWidget {
  const VideoCallButtonPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return FilledButton.tonalIcon(
      onPressed: () {},
      icon: const Icon(Icons.videocam_outlined),
      label: const Text('Video Call'),
    );
  }
}

class ExternalPhoneCallButtonPlaceholder extends StatelessWidget {
  const ExternalPhoneCallButtonPlaceholder({
    required this.phoneNumber,
    super.key,
  });

  final String phoneNumber;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () => _startPhoneCall(context),
      icon: const Icon(Icons.phone_forwarded_outlined),
      label: const Text('Phone Call'),
    );
  }

  Future<void> _startPhoneCall(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    final phoneUri = Uri(scheme: 'tel', path: phoneNumber);
    final launched = await launchUrl(phoneUri);

    if (!launched && context.mounted) {
      messenger.showSnackBar(
        const SnackBar(
            content: Text('Phone dialer is unavailable on this device')),
      );
    }
  }
}

class IncomingCallPlaceholder extends StatelessWidget {
  const IncomingCallPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const _CallStatePanel(
      icon: Icons.call_received_outlined,
      title: 'Incoming Call',
      detail: 'Ringing audio or video call from task participant',
    );
  }
}

class ActiveCallPlaceholder extends StatelessWidget {
  const ActiveCallPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const _CallStatePanel(
      icon: Icons.graphic_eq_outlined,
      title: 'Active Call',
      detail: 'Mute, camera, and end controls will bind to WebRTC later',
    );
  }
}

class _CallStatePanel extends StatelessWidget {
  const _CallStatePanel({
    required this.icon,
    required this.title,
    required this.detail,
  });

  final IconData icon;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.labelLarge),
                  const SizedBox(height: 4),
                  Text(detail),
                ],
              ),
            ),
            const IconButton(
              onPressed: null,
              tooltip: 'End call placeholder',
              icon: Icon(Icons.call_end_outlined),
            ),
          ],
        ),
      ),
    );
  }
}

class TaskChatScreen extends StatelessWidget {
  const TaskChatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _TaskPanel(
      title: 'Task Chat',
      children: [
        _ReadonlyLine(label: 'Room', value: 'Created after task acceptance'),
        _ReadonlyLine(
            label: 'Access', value: 'Customer and assigned agent only'),
        SizedBox(height: 8),
        MessageListPlaceholder(),
        SizedBox(height: 12),
        MessageInputPlaceholder(),
      ],
    );
  }
}

class MessageListPlaceholder extends StatelessWidget {
  const MessageListPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _ChatBubble(
          sender: 'Customer',
          body: 'I uploaded the supporting document placeholder.',
          readState: 'Read by sender',
        ),
        SizedBox(height: 8),
        _ChatBubble(
          sender: 'Agent',
          body: 'I will confirm the organization visit time.',
          readState: 'Unread by customer',
        ),
        SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _StatusChip(label: 'Image placeholder'),
            _StatusChip(label: 'Document placeholder'),
            _StatusChip(label: 'Audio placeholder'),
            _StatusChip(label: 'Video placeholder'),
          ],
        ),
      ],
    );
  }
}

class MessageInputPlaceholder extends StatelessWidget {
  const MessageInputPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AttachmentButtonPlaceholder(),
        SizedBox(width: 8),
        Expanded(
          child: TextField(
            minLines: 1,
            maxLines: 4,
            decoration: InputDecoration(
              labelText: 'Message',
              border: OutlineInputBorder(),
            ),
          ),
        ),
        SizedBox(width: 8),
        IconButton(
          onPressed: null,
          tooltip: 'Send message placeholder',
          icon: Icon(Icons.send_outlined),
        ),
      ],
    );
  }
}

class AttachmentButtonPlaceholder extends StatelessWidget {
  const AttachmentButtonPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const IconButton.filledTonal(
      onPressed: null,
      tooltip: 'Attach file placeholder',
      icon: Icon(Icons.attach_file),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({
    required this.sender,
    required this.body,
    required this.readState,
  });

  final String sender;
  final String body;
  final String readState;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(sender, style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 4),
            Text(body),
            const SizedBox(height: 6),
            Text(readState, style: Theme.of(context).textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}

class _ShellPane extends StatelessWidget {
  const _ShellPane({
    required this.title,
    required this.description,
    required this.children,
  });

  final String title;
  final String description;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(description),
        const SizedBox(height: 20),
        ...children,
      ],
    );
  }
}

class _ButtonRow extends StatelessWidget {
  const _ButtonRow({
    required this.primaryLabel,
    required this.secondaryLabel,
  });

  final String primaryLabel;
  final String secondaryLabel;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        FilledButton(
          onPressed: () {},
          child: Text(primaryLabel),
        ),
        OutlinedButton(
          onPressed: () {},
          child: Text(secondaryLabel),
        ),
      ],
    );
  }
}

class _TaskPanel extends StatelessWidget {
  const _TaskPanel({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _ReadonlyLine extends StatelessWidget {
  const _ReadonlyLine({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 128,
            child: Text(
              label,
              style: Theme.of(context).textTheme.labelLarge,
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _PlaceholderList extends StatelessWidget {
  const _PlaceholderList();

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _StatusChip(label: 'Citizenship front placeholder'),
        SizedBox(height: 8),
        _StatusChip(label: 'Citizenship back placeholder'),
        SizedBox(height: 8),
        _StatusChip(label: 'Selfie placeholder'),
      ],
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: const Icon(Icons.cloud_upload_outlined, size: 18),
      label: Text(label),
    );
  }
}
