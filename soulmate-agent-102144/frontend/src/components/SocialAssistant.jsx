import React, { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Textarea,
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Badge,
  useToast,
  Card,
  CardBody,
  Icon,
  Spinner,
  Flex,
  Divider,
  IconButton,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue
} from '@chakra-ui/react';
import { FaLightbulb, FaComments, FaQuoteLeft, FaCopy, FaRedo, FaMagic, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';

const SocialAssistant = ({ userId }) => {
  const [inputContent, setInputContent] = useState('');
  const [generatedSuggestions, setGeneratedSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const generateContent = async (type) => {
    if (!inputContent.trim()) {
      toast({
        title: '请输入内容',
        description: '请先输入您的想法或需求',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/api/assistant/generate', {
        content: inputContent,
        type
      });

      if (response.data.success) {
        setGeneratedSuggestions(response.data.data.suggestions);
        toast({
          title: 'AI 生成成功',
          description: `已为您生成 ${response.data.data.suggestions.length} 条精彩建议`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'AI 生成失败',
        description: error.response?.data?.message || '服务暂时不可用，请稍后重试',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast({
        title: '已复制到剪贴板',
        status: 'success',
        duration: 1500,
        isClosable: true,
      });
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      toast({
        title: '复制失败',
        description: '请手动复制内容',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    });
  };

  const renderMomentSuggestions = () => (
    <VStack spacing={4} align="stretch">
      {generatedSuggestions.map((item) => (
        <Card 
          key={item.id} 
          variant="outline" 
          borderColor="purple.200"
          _hover={{ 
            boxShadow: 'lg', 
            borderColor: 'purple.400',
            transform: 'translateY(-2px)',
            transition: 'all 0.2s'
          }}
        >
          <CardBody>
            <HStack justify="space-between" mb={3}>
              <HStack spacing={2}>
                <Text fontSize="2xl">{item.emoji}</Text>
                <Badge colorScheme="purple" fontSize="sm" px={3} py={1} borderRadius="full">
                  {item.style}
                </Badge>
              </HStack>
              <Tooltip label={copiedId === item.id ? '已复制' : '复制文案'}>
                <IconButton
                  icon={copiedId === item.id ? <FaCheckCircle /> : <FaCopy />}
                  size="sm"
                  variant="ghost"
                  colorScheme={copiedId === item.id ? 'green' : 'gray'}
                  onClick={() => copyToClipboard(item.text, item.id)}
                  aria-label="复制文案"
                />
              </Tooltip>
            </HStack>
            <Text fontSize="md" color="gray.700" lineHeight="1.8">
              {item.text}
            </Text>
          </CardBody>
        </Card>
      ))}
    </VStack>
  );

  const renderIcebreakerSuggestions = () => (
    <VStack spacing={4} align="stretch">
      {generatedSuggestions.map((item) => (
        <Card 
          key={item.id} 
          variant="outline" 
          borderColor="pink.200"
          _hover={{ 
            boxShadow: 'lg', 
            borderColor: 'pink.400',
            transform: 'translateY(-2px)',
            transition: 'all 0.2s'
          }}
        >
          <CardBody>
            <HStack justify="space-between" mb={3}>
              <HStack spacing={2}>
                <Badge colorScheme="pink" fontSize="sm" px={3} py={1} borderRadius="full">
                  {item.approach}
                </Badge>
                <Badge variant="outline" colorScheme="pink" fontSize="sm" px={3} py={1} borderRadius="full">
                  {item.tone}
                </Badge>
              </HStack>
              <Tooltip label={copiedId === item.id ? '已复制' : '复制话术'}>
                <IconButton
                  icon={copiedId === item.id ? <FaCheckCircle /> : <FaCopy />}
                  size="sm"
                  variant="ghost"
                  colorScheme={copiedId === item.id ? 'green' : 'gray'}
                  onClick={() => copyToClipboard(item.text, item.id)}
                  aria-label="复制话术"
                />
              </Tooltip>
            </HStack>
            <Text fontSize="md" color="gray.700" lineHeight="1.8">
              {item.text}
            </Text>
          </CardBody>
        </Card>
      ))}
    </VStack>
  );

  const renderBioSuggestions = () => (
    <VStack spacing={4} align="stretch">
      {generatedSuggestions.map((item) => (
        <Card 
          key={item.id} 
          variant="outline" 
          borderColor="blue.200"
          _hover={{ 
            boxShadow: 'lg', 
            borderColor: 'blue.400',
            transform: 'translateY(-2px)',
            transition: 'all 0.2s'
          }}
        >
          <CardBody>
            <HStack justify="space-between" mb={3}>
              <HStack spacing={2}>
                <Badge colorScheme="blue" fontSize="sm" px={3} py={1} borderRadius="full">
                  {item.style}
                </Badge>
                <Badge variant="outline" colorScheme="blue" fontSize="sm" px={3} py={1} borderRadius="full">
                  {item.length}
                </Badge>
              </HStack>
              <Tooltip label={copiedId === item.id ? '已复制' : '复制简介'}>
                <IconButton
                  icon={copiedId === item.id ? <FaCheckCircle /> : <FaCopy />}
                  size="sm"
                  variant="ghost"
                  colorScheme={copiedId === item.id ? 'green' : 'gray'}
                  onClick={() => copyToClipboard(item.text, item.id)}
                  aria-label="复制简介"
                />
              </Tooltip>
            </HStack>
            <Text fontSize="md" color="gray.700" lineHeight="1.8">
              {item.text}
            </Text>
          </CardBody>
        </Card>
      ))}
    </VStack>
  );

  const getTabConfig = () => {
    const configs = [
      {
        title: '瞬间创作',
        icon: FaLightbulb,
        color: 'purple',
        placeholder: '例如：今天去了海边，看到了美丽的日落，海浪拍打着礁石，整个世界都被染成了金色...',
        description: 'AI 将为您生成文艺、搞笑、深沉三种风格的文案',
        buttonText: '生成精彩文案',
        type: 'moment',
        renderSuggestions: renderMomentSuggestions
      },
      {
        title: '破冰话术',
        icon: FaComments,
        color: 'pink',
        placeholder: '例如：他的主页显示喜欢读书和旅行，最近分享了一本关于哲学的书《存在与时间》，还发了一张在尼泊尔徒步的照片...',
        description: 'AI 将生成个性化、不套路的开场白',
        buttonText: '生成破冰话术',
        type: 'icebreaker',
        renderSuggestions: renderIcebreakerSuggestions
      },
      {
        title: '个人简介',
        icon: FaQuoteLeft,
        color: 'blue',
        placeholder: '例如：热爱阅读和旅行，喜欢探索未知的世界。对哲学和科技充满好奇，相信每个人都有独特的灵魂...',
        description: 'AI 将生成简约、诗意、真实三种风格的个人简介',
        buttonText: '生成个人简介',
        type: 'bio',
        renderSuggestions: renderBioSuggestions
      }
    ];
    return configs[activeTab];
  };

  const currentConfig = getTabConfig();

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading 
            size="xl" 
            bgGradient="linear(to-r, pink.400, purple.500)" 
            bgClip="text"
            mb={2}
          >
            智能社交助手
          </Heading>
          <Text color="gray.600" fontSize="lg">
            让 AI 帮你创作精彩内容，轻松破冰社交
          </Text>
        </Box>

        <Tabs 
          variant="soft-rounded" 
          colorScheme="purple" 
          index={activeTab}
          onChange={(index) => {
            setActiveTab(index);
            setGeneratedSuggestions([]);
            setInputContent('');
          }}
        >
          <TabList justifyContent="center" flexWrap="wrap" gap={2}>
            <Tab>
              <Icon as={FaLightbulb} mr={2} />
              瞬间创作
            </Tab>
            <Tab>
              <Icon as={FaComments} mr={2} />
              破冰话术
            </Tab>
            <Tab>
              <Icon as={FaQuoteLeft} mr={2} />
              个人简介
            </Tab>
          </TabList>

          <TabPanels>
            {[0, 1, 2].map((index) => (
              <TabPanel key={index} p={0} mt={6}>
                <VStack spacing={6}>
                  <Box w="100%">
                    <Text fontWeight="semibold" mb={2} color={`${currentConfig.color}.600`} fontSize="lg">
                      {currentConfig.title === '瞬间创作' && '分享你的想法'}
                      {currentConfig.title === '破冰话术' && '描述对方的特点或您看到的内容'}
                      {currentConfig.title === '个人简介' && '描述您的兴趣和特点'}
                    </Text>
                    <Textarea
                      value={inputContent}
                      onChange={(e) => setInputContent(e.target.value)}
                      placeholder={currentConfig.placeholder}
                      size="lg"
                      rows={5}
                      focusBorderColor={`${currentConfig.color}.400`}
                      bg={bgColor}
                      borderColor={borderColor}
                      _hover={{ borderColor: `${currentConfig.color}.300` }}
                    />
                    <Flex mt={4} justify="space-between" align="center" flexWrap="wrap" gap={3}>
                      <Text fontSize="sm" color="gray.500" flex="1">
                        {currentConfig.description}
                      </Text>
                      <Button
                        colorScheme={currentConfig.color}
                        leftIcon={isLoading ? <Spinner size="sm" /> : <FaMagic />}
                        onClick={() => generateContent(currentConfig.type)}
                        isLoading={isLoading}
                        loadingText="AI 生成中"
                        size="lg"
                      >
                        {currentConfig.buttonText}
                      </Button>
                    </Flex>
                  </Box>

                  {generatedSuggestions.length > 0 && (
                    <>
                      <Divider />
                      <Box w="100%">
                        <Flex justify="space-between" align="center" mb={4}>
                          <Heading size="md" color={`${currentConfig.color}.600`}>
                            <Icon as={FaMagic} mr={2} />
                            AI 为您生成的内容
                          </Heading>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<FaRedo />}
                            onClick={() => generateContent(currentConfig.type)}
                            isLoading={isLoading}
                            colorScheme={currentConfig.color}
                          >
                            重新生成
                          </Button>
                        </Flex>
                        {currentConfig.renderSuggestions()}
                      </Box>
                    </>
                  )}
                </VStack>
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>

        <Alert 
          status="info" 
          variant="left-accent"
          borderRadius="lg"
          bg="purple.50"
          borderColor="purple.400"
        >
          <AlertIcon as={FaLightbulb} color="purple.500" />
          <Box>
            <AlertTitle color="purple.700" mb={1}>使用提示</AlertTitle>
            <AlertDescription fontSize="sm" color="gray.700">
              <VStack align="start" spacing={1}>
                <Text>• 输入越详细，AI 生成的内容越个性化和精准</Text>
                <Text>• 可以多次生成，选择最适合您风格的内容</Text>
                <Text>• 建议在 AI 生成的基础上加入您的个人特色</Text>
                <Text>• 真诚是最好的社交方式，让内容更有温度</Text>
              </VStack>
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Container>
  );
};

export default SocialAssistant;