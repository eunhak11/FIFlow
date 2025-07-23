import 'package:flutter/material.dart';

class StockCard extends StatelessWidget {
  final String name;
  final String price;
  final String change;
  final String foreigner;

  const StockCard({
    Key? key,
    required this.name,
    required this.price,
    required this.change,
    required this.foreigner,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              name,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('현재가: $price', style: const TextStyle(fontSize: 16)),
                Text(change, style: TextStyle(
                  fontSize: 16,
                  color: change.startsWith('+') ? Colors.red : Colors.blue,
                  fontWeight: FontWeight.bold,
                )),
              ],
            ),
            const SizedBox(height: 8),
            Text('외국인 순매매: $foreigner', style: const TextStyle(fontSize: 14)),
          ],
        ),
      ),
    );
  }
} 