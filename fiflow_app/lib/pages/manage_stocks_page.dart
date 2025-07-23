import 'package:flutter/material.dart';

class ManageStocksPage extends StatelessWidget {
  const ManageStocksPage({Key? key, required this.onBack}) : super(key: key);

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    // 더미 데이터
    final stocks = [
      '삼성전자',
      '프레스티지바이오파마',
      '삼일제약',
    ];
    final TextEditingController controller = TextEditingController();

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Stocks',
                    style: TextStyle(
                      fontFamily: 'Montserrat-SemiBold',
                      fontSize: 36,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.home, size: 32),
                    onPressed: onBack,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  hintText: 'Add with name or code',
                  hintStyle: TextStyle(
                    fontFamily: 'Montserrat-Regular',
                    fontSize: 16,
                    color: Colors.grey,
                  ),
                  border: OutlineInputBorder(),
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                style: const TextStyle(
                  fontFamily: 'Montserrat-Regular',
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 32),
              const Text(
                'Current',
                style: TextStyle(
                  fontFamily: 'Montserrat-SemiBold',
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              ...stocks.map((stock) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 6.0),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        stock,
                        style: const TextStyle(
                          fontFamily: 'Montserrat-Regular',
                          fontSize: 18,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, size: 28),
                      onPressed: () {},
                    ),
                  ],
                ),
              )),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
} 