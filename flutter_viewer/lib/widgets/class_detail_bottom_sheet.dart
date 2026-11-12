import 'package:flutter/material.dart';
import '../models/diagram_model.dart';

class ClassDetailBottomSheet extends StatelessWidget {
  final UmlClassNode node;
  final List<UmlEdge> connectedEdges;
  final Map<String, String>? nodeNames;

  const ClassDetailBottomSheet({
    super.key,
    required this.node,
    this.connectedEdges = const [],
    this.nodeNames,
  });

  static void show(
    BuildContext context,
    UmlClassNode node, [
    List<UmlEdge> allEdges = const [],
    Map<String, String>? nodeNames,
  ]) {
    final connected = allEdges
        .where((e) => e.source == node.id || e.target == node.id)
        .toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ClassDetailBottomSheet(
        node: node,
        connectedEdges: connected,
        nodeNames: nodeNames,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF1E293B), // Slate 800
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
        boxShadow: [
          BoxShadow(
            color: Color(0x66000000),
            blurRadius: 20,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Indicador de arrastre superior (drag handle)
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFF64748B), // Slate 500
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Cabecera con Nombre de la Clase y Estereotipo
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF334155),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      node.isAbstract ? Icons.alt_route_rounded : Icons.view_in_ar_rounded,
                      color: node.isAbstract ? const Color(0xFFF59E0B) : const Color(0xFF60A5FA),
                      size: 26,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (node.stereotype.isNotEmpty)
                          Text(
                            '«${node.stereotype}»',
                            style: const TextStyle(
                              fontSize: 12,
                              fontStyle: FontStyle.italic,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                        Text(
                          node.name,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            fontStyle: node.isAbstract ? FontStyle.italic : FontStyle.normal,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            _buildBadge(
                              label: node.isAbstract ? 'Clase Abstracta' : 'Clase Concreta',
                              color: node.isAbstract
                                  ? const Color(0xFFF59E0B)
                                  : const Color(0xFF10B981),
                            ),
                            if (node.stereotype.isNotEmpty) ...[
                              const SizedBox(width: 6),
                              _buildBadge(
                                label: node.stereotype,
                                color: const Color(0xFF6366F1),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded, color: Colors.white70),
                  ),
                ],
              ),
            ),

            const Divider(color: Color(0xFF334155), thickness: 1),

            // Contenido desplazable (Atributos, Métodos y Relaciones)
            Flexible(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                children: [
                  // 1. Sección de Atributos
                  _buildSectionHeader(
                    icon: Icons.data_object_rounded,
                    title: 'Atributos',
                    count: node.attributes.length,
                    iconColor: const Color(0xFF38BDF8),
                  ),
                  const SizedBox(height: 8),
                  if (node.attributes.isEmpty)
                    _buildEmptyNotice('No hay atributos definidos para esta clase.')
                  else
                    ...node.attributes.map((attr) => _buildMemberTile(attr)),

                  const SizedBox(height: 20),

                  // 2. Sección de Operaciones / Métodos
                  _buildSectionHeader(
                    icon: Icons.functions_rounded,
                    title: 'Operaciones / Métodos',
                    count: node.methods.length,
                    iconColor: const Color(0xFFA78BFA),
                  ),
                  const SizedBox(height: 8),
                  if (node.methods.isEmpty)
                    _buildEmptyNotice('No hay métodos definidos para esta clase.')
                  else
                    ...node.methods.map((method) => _buildMemberTile(method)),

                  const SizedBox(height: 20),

                  // 3. Sección de Relaciones Conectadas
                  _buildSectionHeader(
                    icon: Icons.hub_rounded,
                    title: 'Relaciones Conectadas',
                    count: connectedEdges.length,
                    iconColor: const Color(0xFF34D399),
                  ),
                  const SizedBox(height: 8),
                  if (connectedEdges.isEmpty)
                    _buildEmptyNotice('Esta clase no posee conexiones en el diagrama actual.')
                  else
                    ...connectedEdges.map((edge) => _buildEdgeTile(edge)),

                  const SizedBox(height: 16),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader({
    required IconData icon,
    required String title,
    required int count,
    required Color iconColor,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: iconColor),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: Color(0xFFE2E8F0),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
          decoration: BoxDecoration(
            color: const Color(0xFF334155),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            '$count',
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF94A3B8),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyNotice(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontStyle: FontStyle.italic,
          color: Color(0xFF94A3B8),
        ),
      ),
    );
  }

  Widget _buildMemberTile(String memberText) {
    String visSymbol = '';
    String rest = memberText.trim();
    if (rest.startsWith('+') || rest.startsWith('-') || rest.startsWith('#') || rest.startsWith('~')) {
      visSymbol = rest.substring(0, 1);
      rest = rest.substring(1).trim();
    }

    Color visColor = const Color(0xFF94A3B8);
    if (visSymbol == '+') visColor = const Color(0xFF10B981); // Public -> Green
    if (visSymbol == '-') visColor = const Color(0xFFEF4444); // Private -> Red
    if (visSymbol == '#') visColor = const Color(0xFFF59E0B); // Protected -> Amber
    if (visSymbol == '~') visColor = const Color(0xFF6366F1); // Package -> Indigo

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          if (visSymbol.isNotEmpty) ...[
            Container(
              width: 18,
              height: 18,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: visColor.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                visSymbol,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: visColor,
                  fontFamily: 'monospace',
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: Text(
              rest,
              style: const TextStyle(
                fontSize: 12,
                fontFamily: 'monospace',
                color: Color(0xFFE2E8F0),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEdgeTile(UmlEdge edge) {
    final isSource = edge.source == node.id;
    final otherId = isSource ? edge.target : edge.source;
    final resolvedName = nodeNames?[otherId] ?? otherId;
    final otherRole = isSource ? 'Destino: $resolvedName' : 'Origen: $resolvedName';
    final mult = isSource
        ? (edge.targetMultiplicity.isNotEmpty ? ' [${edge.targetMultiplicity}]' : '')
        : (edge.sourceMultiplicity.isNotEmpty ? ' [${edge.sourceMultiplicity}]' : '');

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          const Icon(Icons.arrow_right_alt_rounded, size: 20, color: Color(0xFF34D399)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${edge.relationType}$mult',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFF1F5F9),
                  ),
                ),
                Text(
                  otherRole,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
          if (edge.isAssociationClass)
            _buildBadge(label: 'Clase-Asociación', color: const Color(0xFFF59E0B)),
        ],
      ),
    );
  }

  Widget _buildBadge({required String label, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
