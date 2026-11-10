import 'dart:convert';

class ChatMessageModel {
  final String id;
  final int diagramId;
  final String senderType; // "USER", "COPILOT", "SYSTEM"
  final int? userId;
  final String userName;
  final String mode; // "CHAT", "EDITOR"
  final String messageType; // "CHAT_MESSAGE", "EDITOR_PROPOSAL", "PROACTIVE_SUGGESTION", "ERROR_ALERT"
  final String content;
  final String? proposalJson;
  final String? proposalStatus; // "PENDING", "ACCEPTED", "IGNORED", "EXPIRED"
  final String? resolvedByUserName;
  final String? resolvedAt;
  final bool isError;
  final String? createdAt;

  ChatMessageModel({
    required this.id,
    required this.diagramId,
    required this.senderType,
    this.userId,
    required this.userName,
    this.mode = 'CHAT',
    this.messageType = 'CHAT_MESSAGE',
    required this.content,
    this.proposalJson,
    this.proposalStatus,
    this.resolvedByUserName,
    this.resolvedAt,
    this.isError = false,
    this.createdAt,
  });

  bool get isUser => senderType == 'USER';
  bool get isCopilot => senderType == 'COPILOT';
  bool get isProposal => messageType == 'EDITOR_PROPOSAL' || (proposalJson != null && proposalJson!.isNotEmpty);
  bool get isPending => proposalStatus == 'PENDING';
  bool get isAccepted => proposalStatus == 'ACCEPTED';
  bool get isIgnored => proposalStatus == 'IGNORED';

  Map<String, dynamic>? get parsedProposal {
    if (proposalJson == null || proposalJson!.isEmpty) return null;
    try {
      return jsonDecode(proposalJson!) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: json['id']?.toString() ?? '',
      diagramId: (json['diagramId'] as num?)?.toInt() ?? 0,
      senderType: json['senderType']?.toString() ?? 'USER',
      userId: (json['userId'] as num?)?.toInt(),
      userName: json['userName']?.toString() ?? 'Usuario',
      mode: json['mode']?.toString() ?? 'CHAT',
      messageType: json['messageType']?.toString() ?? 'CHAT_MESSAGE',
      content: json['content']?.toString() ?? '',
      proposalJson: json['proposalJson']?.toString(),
      proposalStatus: json['proposalStatus']?.toString(),
      resolvedByUserName: json['resolvedByUserName']?.toString(),
      resolvedAt: json['resolvedAt']?.toString(),
      isError: json['isError'] == true,
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'diagramId': diagramId,
      'senderType': senderType,
      'userId': userId,
      'userName': userName,
      'mode': mode,
      'messageType': messageType,
      'content': content,
      'proposalJson': proposalJson,
      'proposalStatus': proposalStatus,
      'resolvedByUserName': resolvedByUserName,
      'resolvedAt': resolvedAt,
      'isError': isError,
      'createdAt': createdAt,
    };
  }

  ChatMessageModel copyWith({
    String? proposalStatus,
    String? resolvedByUserName,
    String? resolvedAt,
  }) {
    return ChatMessageModel(
      id: id,
      diagramId: diagramId,
      senderType: senderType,
      userId: userId,
      userName: userName,
      mode: mode,
      messageType: messageType,
      content: content,
      proposalJson: proposalJson,
      proposalStatus: proposalStatus ?? this.proposalStatus,
      resolvedByUserName: resolvedByUserName ?? this.resolvedByUserName,
      resolvedAt: resolvedAt ?? this.resolvedAt,
      isError: isError,
      createdAt: createdAt,
    );
  }
}

