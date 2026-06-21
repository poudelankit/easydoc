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

class _PlaceholderList extends StatelessWidget {
  const _PlaceholderList();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: const [
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
