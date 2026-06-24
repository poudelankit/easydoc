import 'package:flutter/material.dart';

import 'demo_api_client.dart';

class DemoOtpScreen extends StatefulWidget {
  const DemoOtpScreen({
    required this.api,
    required this.session,
    required this.onSessionChanged,
    super.key,
  });

  final DemoApiClient api;
  final DemoSession? session;
  final ValueChanged<DemoSession?> onSessionChanged;

  @override
  State<DemoOtpScreen> createState() => _DemoOtpScreenState();
}

class _DemoOtpScreenState extends State<DemoOtpScreen> {
  final _phoneController = TextEditingController(text: '+9779800000100');
  final _otpController = TextEditingController(text: '123456');
  bool _loading = false;
  String? _message;
  String? _devOtp;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;

    return _DemoScreen(
      title: 'Phone OTP',
      description:
          'Sign in against the existing backend using the local mock OTP flow.',
      children: [
        if (session != null)
          _DemoPanel(
            title: 'Current Session',
            children: [
              _InfoRow(label: 'Phone', value: session.user.phoneNumber),
              _InfoRow(label: 'Role', value: session.user.role),
              _InfoRow(
                  label: 'Name', value: _displayName(session.user.fullName)),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _loading ? null : _logout,
                icon: const Icon(Icons.logout),
                label: const Text('Clear Session'),
              ),
            ],
          ),
        _DemoPanel(
          title: 'Login',
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.person_outline),
                  label: const Text('Customer demo'),
                  onPressed: () => _phoneController.text = '+9779800000100',
                ),
                ActionChip(
                  avatar: const Icon(Icons.badge_outlined),
                  label: const Text('Agent demo'),
                  onPressed: () => _phoneController.text = '+9779800000200',
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Phone number',
                hintText: '+9779800000100',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'OTP',
                hintText: '123456 in local development',
                border: OutlineInputBorder(),
              ),
            ),
            if (_devOtp != null) ...[
              const SizedBox(height: 8),
              _InlineNotice(
                  icon: Icons.key_outlined, text: 'Local OTP: $_devOtp'),
            ],
            if (_message != null) ...[
              const SizedBox(height: 8),
              _InlineNotice(icon: Icons.info_outline, text: _message!),
            ],
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                FilledButton.icon(
                  onPressed: _loading ? null : _verifyOtp,
                  icon: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.verified_user_outlined),
                  label: const Text('Verify'),
                ),
                OutlinedButton.icon(
                  onPressed: _loading ? null : _sendOtp,
                  icon: const Icon(Icons.sms_outlined),
                  label: const Text('Send OTP'),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _sendOtp() async {
    setState(() {
      _loading = true;
      _message = null;
      _devOtp = null;
    });

    try {
      final response =
          await widget.api.sendOtp(phoneNumber: _phoneController.text);
      if (!mounted) {
        return;
      }
      setState(() {
        _devOtp = _string(response['devOtp'], fallback: null);
        _message = 'OTP sent. Use the local mock OTP in development.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _message = error.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _loading = true;
      _message = null;
    });

    try {
      final session = await widget.api.verifyOtp(
        phoneNumber: _phoneController.text,
        otp: _otpController.text,
      );
      widget.onSessionChanged(session);
      if (!mounted) {
        return;
      }
      setState(() => _message = 'Signed in as ${session.user.role}.');
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _message = error.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _logout() async {
    await widget.api.clearSession();
    widget.onSessionChanged(null);
    if (mounted) {
      setState(() => _message = 'Local session cleared.');
    }
  }
}

class DemoCustomerAccountScreen extends StatelessWidget {
  const DemoCustomerAccountScreen({
    required this.session,
    super.key,
  });

  final DemoSession? session;

  @override
  Widget build(BuildContext context) {
    return _DemoScreen(
      title: 'Customer',
      description: 'Current customer session context for demo viewing.',
      children: [
        _SessionPanel(session: session, expectedRole: 'CUSTOMER'),
      ],
    );
  }
}

class DemoAgentAccountScreen extends StatelessWidget {
  const DemoAgentAccountScreen({
    required this.session,
    super.key,
  });

  final DemoSession? session;

  @override
  Widget build(BuildContext context) {
    return _DemoScreen(
      title: 'Agent',
      description: 'Current agent session context for demo viewing.',
      children: [
        _SessionPanel(session: session, expectedRole: 'AGENT'),
      ],
    );
  }
}

class DemoCustomerTasksScreen extends StatefulWidget {
  const DemoCustomerTasksScreen({
    required this.api,
    required this.session,
    super.key,
  });

  final DemoApiClient api;
  final DemoSession? session;

  @override
  State<DemoCustomerTasksScreen> createState() =>
      _DemoCustomerTasksScreenState();
}

class _DemoCustomerTasksScreenState extends State<DemoCustomerTasksScreen> {
  Future<_TaskDemoData>? _future;

  @override
  void didUpdateWidget(DemoCustomerTasksScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.session?.accessToken != widget.session?.accessToken) {
      _future = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    if (session == null || session.user.role != 'CUSTOMER') {
      return _DemoScreen(
        title: 'Customer Tasks',
        description:
            'Read-only task, timeline, chat, review, and notification data from the backend.',
        children: [
          _RoleGate(
            session: session,
            expectedRole: 'CUSTOMER',
            child: const SizedBox.shrink(),
          ),
        ],
      );
    }

    final future = _future ??= _load();
    return _DemoScreen(
      title: 'Customer Tasks',
      description:
          'Read-only task, timeline, chat, review, and notification data from the backend.',
      children: [
        _DataPanel<_TaskDemoData>(
          future: future,
          onRefresh: _refresh,
          builder: (data) => [
            _TaskListPanel(title: 'My Tasks', tasks: data.tasks),
            if (data.detail == null)
              const _EmptyPanel(message: 'No customer tasks were returned.')
            else ...[
              _TaskDetailPanel(
                  task: data.detail!, participantLabel: 'Assigned agent'),
              _TimelinePanel(timeline: data.timeline),
              _MessagesPanel(messages: data.messages),
              _ReviewsPanel(title: 'Submitted Reviews', reviews: data.reviews),
            ],
          ],
        ),
      ],
    );
  }

  Future<_TaskDemoData> _load() => _loadTaskDemoData(
        api: widget.api,
        includeCustomerReviews: true,
      );

  void _refresh() {
    setState(() => _future = _load());
  }
}

class DemoAgentTasksScreen extends StatefulWidget {
  const DemoAgentTasksScreen({
    required this.api,
    required this.session,
    super.key,
  });

  final DemoApiClient api;
  final DemoSession? session;

  @override
  State<DemoAgentTasksScreen> createState() => _DemoAgentTasksScreenState();
}

class _DemoAgentTasksScreenState extends State<DemoAgentTasksScreen> {
  Future<_AgentDemoData>? _future;

  @override
  void didUpdateWidget(DemoAgentTasksScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.session?.accessToken != widget.session?.accessToken) {
      _future = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    if (session == null || session.user.role != 'AGENT') {
      return _DemoScreen(
        title: 'Agent Work',
        description:
            'Read-only assigned task, nearby request, timeline, chat, and review data from the backend.',
        children: [
          _RoleGate(
            session: session,
            expectedRole: 'AGENT',
            child: const SizedBox.shrink(),
          ),
        ],
      );
    }

    final future = _future ??= _load();
    return _DemoScreen(
      title: 'Agent Work',
      description:
          'Read-only assigned task, nearby request, timeline, chat, and review data from the backend.',
      children: [
        _DataPanel<_AgentDemoData>(
          future: future,
          onRefresh: _refresh,
          builder: (data) => [
            _TaskListPanel(
                title: 'Nearby Requests', tasks: data.nearbyRequests),
            if (data.nearbyError != null)
              _InlineNotice(icon: Icons.info_outline, text: data.nearbyError!),
            _TaskListPanel(title: 'Assigned Tasks', tasks: data.taskData.tasks),
            if (data.taskData.detail == null)
              const _EmptyPanel(message: 'No assigned agent task was returned.')
            else ...[
              _TaskDetailPanel(
                  task: data.taskData.detail!, participantLabel: 'Customer'),
              _TimelinePanel(timeline: data.taskData.timeline),
              _MessagesPanel(messages: data.taskData.messages),
              _ReviewsPanel(
                  title: 'Received Reviews', reviews: data.taskData.reviews),
            ],
          ],
        ),
      ],
    );
  }

  Future<_AgentDemoData> _load() async {
    final taskData = await _loadTaskDemoData(
      api: widget.api,
      includeAgentReviews: true,
    );

    List<JsonMap> nearbyRequests = [];
    String? nearbyError;
    try {
      nearbyRequests = await widget.api.getAgentNearbyRequests();
    } catch (error) {
      nearbyError = error.toString();
    }

    return _AgentDemoData(
      taskData: taskData,
      nearbyRequests: nearbyRequests,
      nearbyError: nearbyError,
    );
  }

  void _refresh() {
    setState(() => _future = _load());
  }
}

class DemoNotificationsScreen extends StatefulWidget {
  const DemoNotificationsScreen({
    required this.api,
    required this.session,
    super.key,
  });

  final DemoApiClient api;
  final DemoSession? session;

  @override
  State<DemoNotificationsScreen> createState() =>
      _DemoNotificationsScreenState();
}

class _DemoNotificationsScreenState extends State<DemoNotificationsScreen> {
  Future<_NotificationsDemoData>? _future;

  @override
  void didUpdateWidget(DemoNotificationsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.session?.accessToken != widget.session?.accessToken) {
      _future = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    if (session == null) {
      return _DemoScreen(
        title: 'Notifications',
        description: 'Read-only in-app notification feed from the backend.',
        children: [
          _RoleGate(
            session: session,
            expectedRole: null,
            child: const SizedBox.shrink(),
          ),
        ],
      );
    }

    final future = _future ??= _load();
    return _DemoScreen(
      title: 'Notifications',
      description: 'Read-only in-app notification feed from the backend.',
      children: [
        _DataPanel<_NotificationsDemoData>(
          future: future,
          onRefresh: _refresh,
          builder: (data) => [
            _DemoPanel(
              title: 'Unread',
              children: [
                Row(
                  children: [
                    Badge(
                      label: Text(data.unreadCount.toString()),
                      child: const Icon(Icons.notifications_active_outlined,
                          size: 32),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text('${data.unreadCount} unread notifications'),
                    ),
                  ],
                ),
              ],
            ),
            _NotificationListPanel(notifications: data.notifications),
          ],
        ),
      ],
    );
  }

  Future<_NotificationsDemoData> _load() async {
    final notifications = await widget.api.getNotifications();
    final unreadCount = await widget.api.getUnreadNotificationCount();
    return _NotificationsDemoData(
      notifications: notifications,
      unreadCount: unreadCount,
    );
  }

  void _refresh() {
    setState(() => _future = _load());
  }
}

class _TaskDemoData {
  const _TaskDemoData({
    required this.tasks,
    required this.messages,
    required this.reviews,
    this.detail,
    this.timeline,
  });

  final List<JsonMap> tasks;
  final JsonMap? detail;
  final JsonMap? timeline;
  final List<JsonMap> messages;
  final List<JsonMap> reviews;
}

class _AgentDemoData {
  const _AgentDemoData({
    required this.taskData,
    required this.nearbyRequests,
    this.nearbyError,
  });

  final _TaskDemoData taskData;
  final List<JsonMap> nearbyRequests;
  final String? nearbyError;
}

class _NotificationsDemoData {
  const _NotificationsDemoData({
    required this.notifications,
    required this.unreadCount,
  });

  final List<JsonMap> notifications;
  final int unreadCount;
}

Future<_TaskDemoData> _loadTaskDemoData({
  required DemoApiClient api,
  bool includeCustomerReviews = false,
  bool includeAgentReviews = false,
}) async {
  final tasks = await api.getMyTasks();
  JsonMap? detail;
  JsonMap? timeline;
  List<JsonMap> messages = [];
  List<JsonMap> reviews = [];

  if (tasks.isNotEmpty) {
    final taskId = _string(tasks.first['id']);
    detail = await api.getTaskDetail(taskId);
    timeline = await api.getTaskTimeline(taskId);
    messages = await api.getTaskMessages(taskId);
  }

  if (includeCustomerReviews) {
    reviews = await api.getCustomerReviews();
  } else if (includeAgentReviews) {
    reviews = await api.getAgentReviews();
  }

  return _TaskDemoData(
    tasks: tasks,
    detail: detail,
    timeline: timeline,
    messages: messages,
    reviews: reviews,
  );
}

class _DemoScreen extends StatelessWidget {
  const _DemoScreen({
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
        Text(title, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        Text(description),
        const SizedBox(height: 20),
        ...children,
      ],
    );
  }
}

class _DemoPanel extends StatelessWidget {
  const _DemoPanel({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: DecoratedBox(
        decoration: BoxDecoration(
          border:
              Border.all(color: Theme.of(context).colorScheme.outlineVariant),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 14),
              ...children,
            ],
          ),
        ),
      ),
    );
  }
}

class _DataPanel<T> extends StatelessWidget {
  const _DataPanel({
    required this.future,
    required this.onRefresh,
    required this.builder,
  });

  final Future<T> future;
  final VoidCallback onRefresh;
  final List<Widget> Function(T data) builder;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const _DemoPanel(
            title: 'Loading',
            children: [
              Center(child: CircularProgressIndicator()),
            ],
          );
        }

        if (snapshot.hasError) {
          return _DemoPanel(
            title: 'Error',
            children: [
              _InlineNotice(
                icon: Icons.error_outline,
                text: snapshot.error.toString(),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: onRefresh,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          );
        }

        final data = snapshot.data;
        if (data == null) {
          return const _EmptyPanel(message: 'No data returned.');
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton.icon(
                onPressed: onRefresh,
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh'),
              ),
            ),
            const SizedBox(height: 12),
            ...builder(data),
          ],
        );
      },
    );
  }
}

class _RoleGate extends StatelessWidget {
  const _RoleGate({
    required this.session,
    required this.expectedRole,
    required this.child,
  });

  final DemoSession? session;
  final String? expectedRole;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final activeSession = session;
    if (activeSession == null) {
      return const _EmptyPanel(
          message: 'Sign in on the OTP tab before loading demo data.');
    }

    if (expectedRole != null && activeSession.user.role != expectedRole) {
      return _EmptyPanel(
        message:
            'Signed in as ${activeSession.user.role}. Use a $expectedRole demo account for this tab.',
      );
    }

    return child;
  }
}

class _SessionPanel extends StatelessWidget {
  const _SessionPanel({
    required this.session,
    required this.expectedRole,
  });

  final DemoSession? session;
  final String expectedRole;

  @override
  Widget build(BuildContext context) {
    final activeSession = session;
    if (activeSession == null) {
      return const _EmptyPanel(
          message: 'No saved session. Sign in on the OTP tab.');
    }

    return _DemoPanel(
      title: activeSession.user.role == expectedRole
          ? 'Active Session'
          : 'Different Role Signed In',
      children: [
        _InfoRow(
            label: 'Name', value: _displayName(activeSession.user.fullName)),
        _InfoRow(label: 'Phone', value: activeSession.user.phoneNumber),
        _InfoRow(label: 'Role', value: activeSession.user.role),
        _InfoRow(label: 'Status', value: activeSession.user.status),
      ],
    );
  }
}

class _TaskListPanel extends StatelessWidget {
  const _TaskListPanel({
    required this.title,
    required this.tasks,
  });

  final String title;
  final List<JsonMap> tasks;

  @override
  Widget build(BuildContext context) {
    return _DemoPanel(
      title: title,
      children: tasks.isEmpty
          ? const [
              Text('No tasks returned.'),
            ]
          : tasks.map((task) {
              final distance = task['distanceMeters'];
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.assignment_outlined),
                title:
                    Text(_string(task['taskName'], fallback: 'Untitled task')),
                subtitle: Text(
                  [
                    _string(task['documentType'], fallback: 'Document'),
                    _string(task['organizationName'], fallback: 'Organization'),
                    if (distance != null) '${distance.toString()} m',
                  ].join(' - '),
                ),
                trailing: _StatusPill(
                    label: _string(task['status'], fallback: 'UNKNOWN')),
              );
            }).toList(),
    );
  }
}

class _TaskDetailPanel extends StatelessWidget {
  const _TaskDetailPanel({
    required this.task,
    required this.participantLabel,
  });

  final JsonMap task;
  final String participantLabel;

  @override
  Widget build(BuildContext context) {
    final organizationLocation = _map(task['organizationLocation']);
    final assignedAgent = _mapOrNull(task['assignedAgent']);
    final customer = _mapOrNull(task['customer']);
    final participant =
        participantLabel == 'Customer' ? customer : assignedAgent;

    return _DemoPanel(
      title: 'Task Detail',
      children: [
        _InfoRow(
            label: 'Task',
            value: _string(task['taskName'], fallback: 'Untitled task')),
        _InfoRow(
            label: 'Status',
            value: _string(task['status'], fallback: 'UNKNOWN')),
        _InfoRow(
            label: 'Document',
            value: _string(task['documentType'], fallback: '-')),
        _InfoRow(
            label: 'Organization',
            value: _string(task['organizationName'], fallback: '-')),
        _InfoRow(
            label: 'Address',
            value: _string(task['organizationAddress'], fallback: '-')),
        _InfoRow(
          label: 'Latitude',
          value: _string(organizationLocation['latitude'], fallback: '-'),
        ),
        _InfoRow(
          label: 'Longitude',
          value: _string(organizationLocation['longitude'], fallback: '-'),
        ),
        _InfoRow(
            label: 'Expected',
            value: _string(task['expectedCompletionDate'], fallback: '-')),
        _InfoRow(
            label: 'Description',
            value: _string(task['requestDescription'], fallback: '-')),
        if (participant != null) ...[
          const Divider(height: 24),
          _InfoRow(
              label: participantLabel,
              value: _string(participant['fullName'], fallback: '-')),
          _InfoRow(
              label: 'Phone',
              value: _string(participant['phoneNumber'], fallback: '-')),
        ],
      ],
    );
  }
}

class _TimelinePanel extends StatelessWidget {
  const _TimelinePanel({required this.timeline});

  final JsonMap? timeline;

  @override
  Widget build(BuildContext context) {
    final events = _list(timeline?['events']);
    return _DemoPanel(
      title: 'Timeline',
      children: events.isEmpty
          ? const [
              Text('No timeline events returned.'),
            ]
          : events.map((event) {
              final actor = _map(event['actor']);
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.radio_button_checked, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _string(event['toStatus'],
                                fallback: _string(event['eventType'],
                                    fallback: 'Event')),
                            style: Theme.of(context).textTheme.labelLarge,
                          ),
                          Text(_string(event['note'], fallback: 'No note')),
                          Text(
                            '${_string(actor['role'], fallback: 'Actor')} - ${_displayName(_string(actor['fullName'], fallback: null))}',
                            style: Theme.of(context).textTheme.labelSmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
    );
  }
}

class _MessagesPanel extends StatelessWidget {
  const _MessagesPanel({required this.messages});

  final List<JsonMap> messages;

  @override
  Widget build(BuildContext context) {
    return _DemoPanel(
      title: 'Messages',
      children: messages.isEmpty
          ? const [
              Text('No messages returned.'),
            ]
          : messages.map((message) {
              final attachments = _list(message['attachments']);
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _displayName(_string(message['senderFullName'],
                              fallback: null)),
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                        const SizedBox(height: 4),
                        Text(_string(message['body'], fallback: '')),
                        if (attachments.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: attachments
                                .map(
                                  (attachment) => _StatusPill(
                                    label: _string(
                                      attachment['originalFilename'],
                                      fallback: _string(
                                          attachment['attachmentType'],
                                          fallback: 'Attachment'),
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
    );
  }
}

class _ReviewsPanel extends StatelessWidget {
  const _ReviewsPanel({
    required this.title,
    required this.reviews,
  });

  final String title;
  final List<JsonMap> reviews;

  @override
  Widget build(BuildContext context) {
    return _DemoPanel(
      title: title,
      children: reviews.isEmpty
          ? const [
              Text('No reviews returned.'),
            ]
          : reviews.map((review) {
              final ratings = _map(review['ratings']);
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.star_outline),
                title: Text(
                    _string(review['reviewText'], fallback: 'No review text')),
                subtitle: Text(
                  'Overall ${_string(ratings['overall'], fallback: '-')} - '
                  'Communication ${_string(ratings['communication'], fallback: '-')} - '
                  'Timeliness ${_string(ratings['timeliness'], fallback: '-')}',
                ),
              );
            }).toList(),
    );
  }
}

class _NotificationListPanel extends StatelessWidget {
  const _NotificationListPanel({required this.notifications});

  final List<JsonMap> notifications;

  @override
  Widget build(BuildContext context) {
    return _DemoPanel(
      title: 'Notification Feed',
      children: notifications.isEmpty
          ? const [
              Text('No notifications returned.'),
            ]
          : notifications.map((notification) {
              final unread = notification['readAt'] == null;
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                    unread ? Icons.markunread_outlined : Icons.drafts_outlined),
                title: Text(
                    _string(notification['title'], fallback: 'Notification')),
                subtitle: Text(_string(notification['body'], fallback: '')),
                trailing: _StatusPill(
                  label: _string(notification['type'],
                      fallback: unread ? 'UNREAD' : 'READ'),
                ),
              );
            }).toList(),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
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
            width: 112,
            child: Text(label, style: Theme.of(context).textTheme.labelLarge),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _EmptyPanel extends StatelessWidget {
  const _EmptyPanel({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return _DemoPanel(
      title: 'Empty',
      children: [
        _InlineNotice(icon: Icons.inbox_outlined, text: message),
      ],
    );
  }
}

class _InlineNotice extends StatelessWidget {
  const _InlineNotice({
    required this.icon,
    required this.text,
  });

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20),
        const SizedBox(width: 8),
        Expanded(child: Text(text)),
      ],
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(label),
      visualDensity: VisualDensity.compact,
    );
  }
}

List<JsonMap> _list(Object? value) {
  if (value is List) {
    return value.map(_map).toList();
  }
  return [];
}

JsonMap _map(Object? value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return value.map((key, mapValue) => MapEntry(key.toString(), mapValue));
  }
  return {};
}

JsonMap? _mapOrNull(Object? value) {
  final parsed = _map(value);
  return parsed.isEmpty ? null : parsed;
}

String _string(Object? value, {String? fallback = ''}) {
  if (value == null) {
    return fallback ?? '';
  }
  final text = value.toString();
  return text.isEmpty ? fallback ?? '' : text;
}

String _displayName(String? value) {
  final text = value?.trim();
  return text == null || text.isEmpty ? 'Not set' : text;
}
