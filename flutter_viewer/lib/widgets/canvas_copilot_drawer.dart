import 'package:flutter/material.dart';
import '../models/chat_message_model.dart';
import '../state/diagram_viewer_controller.dart';

class CanvasCopilotDrawer extends StatefulWidget {
  final DiagramViewerController controller;

  const CanvasCopilotDrawer({super.key, required this.controller});

  @override
  State<CanvasCopilotDrawer> createState() => _CanvasCopilotDrawerState();
}

class _CanvasCopilotDrawerState extends State<CanvasCopilotDrawer> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  String _currentMode = 'CHAT'; // "CHAT" | "EDITOR"

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _handleSend() {
    final text = _inputController.text.trim();
    if (text.isEmpty || widget.controller.isCopilotLoading) return;

    _inputController.clear();
    widget.controller.sendCopilotMessage(text, _currentMode);
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final messages = widget.controller.chatMessages;
    final isLoading = widget.controller.isCopilotLoading;

    return Container(
      height: MediaQuery.of(context).size.height * 0.78,
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A), // Slate 900
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(
          top: BorderSide(color: Color(0xFF334155), width: 1.5),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black54,
            blurRadius: 20,
            offset: Offset(0, -5),
          ),
        ],
      ),
      child: Column(
        children: [
          // 1. Barra superior de arrastre y título
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF1E293B), // Slate 800
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              border: Border(bottom: BorderSide(color: Color(0xFF334155))),
            ),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF9333EA)],
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Copilot UML en Vivo',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Asistente de edición y arquitectura',
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                // Botón cerrar
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8)),
                  onPressed: () => Navigator.pop(context),
                  tooltip: 'Cerrar Copilot',
                ),
              ],
            ),
          ),

          // 2. Selector de Modo: Modo Chat vs Modo Editor
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF161F33),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _currentMode = 'CHAT'),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: _currentMode == 'CHAT' ? const Color(0xFF334155) : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _currentMode == 'CHAT' ? const Color(0xFF818CF8) : Colors.transparent,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.chat_bubble_outline_rounded,
                            size: 15,
                            color: _currentMode == 'CHAT' ? Colors.white : const Color(0xFF94A3B8),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Modo Chat',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _currentMode == 'CHAT' ? Colors.white : const Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _currentMode = 'EDITOR'),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: _currentMode == 'EDITOR' ? const Color(0xFF4F46E5) : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _currentMode == 'EDITOR' ? const Color(0xFFA5B4FC) : Colors.transparent,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.edit_note_rounded,
                            size: 17,
                            color: _currentMode == 'EDITOR' ? Colors.white : const Color(0xFF94A3B8),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Modo Editor',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _currentMode == 'EDITOR' ? Colors.white : const Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 3. Lista de Mensajes del Chat
          Expanded(
            child: messages.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E293B),
                              shape: BoxShape.circle,
                              border: Border.all(color: const Color(0xFF334155)),
                            ),
                            child: const Icon(Icons.smart_toy_outlined, size: 36, color: Color(0xFF818CF8)),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            '¡Hola! Soy tu Copilot UML',
                            style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Pídeme sugerencias arquitectónicas o usa el Modo Editor para agregar clases y relaciones al diagrama en vivo.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, height: 1.4),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final msg = messages[index];
                      return _buildMessageItem(msg);
                    },
                  ),
          ),

          // 4. Indicador de carga si la IA está pensando
          if (isLoading) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: const Color(0xFF1E293B),
              child: const Row(
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF818CF8)),
                    ),
                  ),
                  SizedBox(width: 10),
                  Text(
                    'Copilot está procesando tu solicitud...',
                    style: TextStyle(color: Color(0xFFC7D2FE), fontSize: 11.5, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ],

          // 5. Input inferior para escribir mensaje
          Container(
            padding: EdgeInsets.only(
              left: 12,
              right: 12,
              top: 8,
              bottom: MediaQuery.of(context).viewInsets.bottom + 12,
            ),
            decoration: const BoxDecoration(
              color: Color(0xFF1E293B),
              border: Border(top: BorderSide(color: Color(0xFF334155))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFF475569)),
                    ),
                    child: TextField(
                      controller: _inputController,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: _currentMode == 'EDITOR'
                            ? 'Ej: Agrega clase Factura con total y fecha...'
                            : 'Pregunta sobre normalización o arquitectura...',
                        hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      onSubmitted: (_) => _handleSend(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _handleSend,
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      color: Color(0xFF4F46E5), // Indigo 600
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageItem(ChatMessageModel msg) {
    final isUser = msg.isUser;
    final isProposal = msg.isProposal;
    final isApplying = widget.controller.applyingProposalId == msg.id;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          // Autor y timestamp
          Padding(
            padding: const EdgeInsets.only(bottom: 3),
            child: Text(
              isUser ? 'Tú (Móvil)' : 'Copilot IA',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: isUser ? const Color(0xFF94A3B8) : const Color(0xFF818CF8),
              ),
            ),
          ),

          // Burbuja de texto
          Container(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isUser ? const Color(0xFF3B82F6) : const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(14).copyWith(
                bottomRight: isUser ? const Radius.circular(2) : const Radius.circular(14),
                bottomLeft: !isUser ? const Radius.circular(2) : const Radius.circular(14),
              ),
              border: Border.all(
                color: isUser ? const Color(0xFF2563EB) : const Color(0xFF334155),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  msg.content,
                  style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.4),
                ),

                // Tarjeta de Propuesta Interactiva (Modo Editor)
                if (isProposal) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: msg.isAccepted
                            ? const Color(0xFF10B981) // Emerald
                            : (msg.isIgnored ? const Color(0xFF64748B) : const Color(0xFF6366F1)),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              msg.isAccepted
                                  ? Icons.check_circle_rounded
                                  : (msg.isIgnored ? Icons.cancel_rounded : Icons.pending_actions_rounded),
                              size: 15,
                              color: msg.isAccepted
                                  ? const Color(0xFF10B981)
                                  : (msg.isIgnored ? const Color(0xFF94A3B8) : const Color(0xFF818CF8)),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              msg.isAccepted
                                  ? 'Propuesta Aplicada'
                                  : (msg.isIgnored ? 'Propuesta Descartada' : 'Propuesta Pendiente de Edición'),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: msg.isAccepted
                                    ? const Color(0xFF10B981)
                                    : (msg.isIgnored ? const Color(0xFF94A3B8) : const Color(0xFF818CF8)),
                              ),
                            ),
                          ],
                        ),
                        if (msg.isPending) ...[
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: () => widget.controller.ignoreProposal(msg),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Color(0xFF64748B)),
                                    padding: const EdgeInsets.symmetric(vertical: 4),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                  ),
                                  child: const Text('Descartar', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                flex: 2,
                                child: ElevatedButton.icon(
                                  onPressed: isApplying ? null : () => widget.controller.acceptProposal(msg),
                                  icon: isApplying
                                      ? const SizedBox(
                                          width: 12,
                                          height: 12,
                                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                        )
                                      : const Icon(Icons.flash_on_rounded, size: 14),
                                  label: Text(isApplying ? 'Aplicando...' : 'Aplicar al Lienzo', style: const TextStyle(fontSize: 11)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF4F46E5),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 4),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

