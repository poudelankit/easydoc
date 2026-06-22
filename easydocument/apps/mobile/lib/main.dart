import 'package:flutter/material.dart';

void main() {
  runApp(const EasyDocumentMobileApp());
}

class EasyDocumentMobileApp extends StatelessWidget {
  const EasyDocumentMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
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
      home: const PhaseOneShell(),
    );
  }
}

class PhaseOneShell extends StatefulWidget {
  const PhaseOneShell({super.key});

  @override
  State<PhaseOneShell> createState() => _PhaseOneShellState();
}

class _PhaseOneShellState extends State<PhaseOneShell> {
  int _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      const OtpShellScreen(),
      const CustomerProfileShellScreen(),
      const AgentKycShellScreen(),
      const CustomerTaskShellScreen(),
      const AgentTaskShellScreen(),
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
        ],
      ),
    );
  }
}

class OtpShellScreen extends StatelessWidget {
  const OtpShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ShellPane(
      title: 'Phone OTP',
      description: 'Request and verify a Nepal mobile OTP before customer or agent registration.',
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
      description: 'Collect identity, citizenship placeholders, permanent address, and permanent location.',
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
      description: 'Create a document service request and review the accepted agent details.',
      children: [
        CustomerCreateTaskScreen(),
        SizedBox(height: 24),
        CustomerTaskDetailScreen(),
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
        _ReadonlyLine(label: 'Task name', value: 'SITA CUSTOMER-CITIZENSHIP-CDAO'),
        _ReadonlyLine(label: 'Status', value: 'CREATED or ACCEPTED'),
        _ReadonlyLine(label: 'Assigned agent', value: 'Shown after acceptance'),
        _ReadonlyLine(label: 'Agent phone', value: 'Shown after acceptance'),
        SizedBox(height: 12),
        _ButtonRow(
          primaryLabel: 'Refresh Detail',
          secondaryLabel: 'Open Chat',
        ),
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
      description: 'Review nearby customer requests and inspect accepted task details.',
      children: [
        AgentNearbyRequestsScreen(),
        SizedBox(height: 24),
        AgentAcceptedTaskDetailScreen(),
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
        _ReadonlyLine(label: 'Task status', value: 'ACCEPTED'),
        _ReadonlyLine(label: 'Organization address', value: 'Babarmahal, Kathmandu'),
        SizedBox(height: 12),
        _ButtonRow(
          primaryLabel: 'Refresh Task',
          secondaryLabel: 'Open Chat',
        ),
      ],
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
        _ReadonlyLine(label: 'Access', value: 'Customer and assigned agent only'),
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
