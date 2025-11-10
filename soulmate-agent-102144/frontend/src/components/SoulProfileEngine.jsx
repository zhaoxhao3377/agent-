import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Progress,
  Badge,
  useToast,
  Card,
  CardBody,
  Icon,
  Spinner,
  Flex,
  Grid,
  GridItem,
  Avatar,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  CircularProgress,
  CircularProgressLabel,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  useColorModeValue,
  Wrap,
  WrapItem
} from '@chakra-ui/react';
import { 
  FaBrain, 
  FaHeart, 
  FaComments, 
  FaStar, 
  FaSync,
  FaChartLine,
  FaUserCircle,
  FaLightbulb,
  FaMagic,
  FaCheckCircle
} from 'react-icons/fa';
import axios from 'axios';

const SoulProfileEngine = ({ userId }) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const gradientBg = useColorModeValue('purple.50', 'purple.900');

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/profile/get', {
        params: { userId }
      });

      if (response.data.success) {
        setProfile(response.data.data);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast({
          title: '尚未生成画像',
          description: '点击"分析我的灵魂画像"按钮开始',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: '加载失败',
          description: error.response?.data?.message || '请稍后重试',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeProfile = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      const response = await axios.post('/api/profile/analyze', {
        userId,
        userData: {}
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (response.data.success) {
        setProfile(response.data.data);
        toast({
          title: '画像分析完成',
          description: response.data.data.analysis?.aiEnhanced 
            ? 'AI 深度分析已完成，为您生成专属灵魂画像' 
            : '您的灵魂画像已生成',
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      toast({
        title: '分析失败',
        description: error.response?.data?.message || '请稍后重试',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }, 500);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'orange';
    return 'red';
  };

  const renderInterests = () => {
    if (!profile?.profile?.interests?.length) return null;

    return (
      <Card variant="outline" borderColor="purple.200" bg={bgColor}>
        <CardBody>
          <HStack mb={4}>
            <Icon as={FaLightbulb} color="purple.500" boxSize={5} />
            <Heading size="md" color="purple.600">兴趣图谱</Heading>
            <Badge colorScheme="purple" fontSize="xs" px={2} py={0.5} borderRadius="full">
              {profile.profile.interests.length} 项
            </Badge>
          </HStack>
          <Wrap spacing={2}>
            {profile.profile.interests.map((interest, index) => (
              <WrapItem key={index}>
                <Badge 
                  colorScheme="purple" 
                  fontSize="md"
                  px={3}
                  py={1.5}
                  borderRadius="full"
                  cursor="pointer"
                  _hover={{ transform: 'scale(1.05)', transition: 'all 0.2s' }}
                >
                  {interest}
                </Badge>
              </WrapItem>
            ))}
          </Wrap>
        </CardBody>
      </Card>
    );
  };

  const renderValues = () => {
    if (!profile?.profile?.values?.length) return null;

    return (
      <Card variant="outline" borderColor="pink.200" bg={bgColor}>
        <CardBody>
          <HStack mb={4}>
            <Icon as={FaHeart} color="pink.500" boxSize={5} />
            <Heading size="md" color="pink.600">核心价值观</Heading>
            <Badge colorScheme="pink" fontSize="xs" px={2} py={0.5} borderRadius="full">
              {profile.profile.values.length} 项
            </Badge>
          </HStack>
          <Wrap spacing={2}>
            {profile.profile.values.map((value, index) => (
              <WrapItem key={index}>
                <Badge 
                  colorScheme="pink" 
                  fontSize="md"
                  px={3}
                  py={1.5}
                  borderRadius="full"
                  cursor="pointer"
                  _hover={{ transform: 'scale(1.05)', transition: 'all 0.2s' }}
                >
                  {value}
                </Badge>
              </WrapItem>
            ))}
          </Wrap>
        </CardBody>
      </Card>
    );
  };

  const renderPersonalityVector = () => {
    if (!profile?.profile?.personalityVector?.length) return null;

    return (
      <Card variant="outline" borderColor="blue.200" bg={bgColor}>
        <CardBody>
          <HStack mb={4} justify="space-between">
            <HStack>
              <Icon as={FaChartLine} color="blue.500" boxSize={5} />
              <Heading size="md" color="blue.600">个性维度分析</Heading>
            </HStack>
            {profile?.analysis?.aiEnhanced && (
              <Badge colorScheme="blue" fontSize="xs" px={2} py={1} borderRadius="full">
                <HStack spacing={1}>
                  <Icon as={FaMagic} boxSize={3} />
                  <Text>AI 增强</Text>
                </HStack>
              </Badge>
            )}
          </HStack>
          <VStack spacing={4} align="stretch">
            {profile.profile.personalityVector.map((item, index) => (
              <Box key={index}>
                <Flex justify="space-between" align="center" mb={2}>
                  <HStack>
                    <Text fontWeight="semibold" color="gray.700" fontSize="md">
                      {item.dimension}
                    </Text>
                    <Tooltip label={`得分: ${item.score}/100`}>
                      <Icon as={FaStar} color={`${getScoreColor(item.score)}.400`} boxSize={3} />
                    </Tooltip>
                  </HStack>
                  <Text fontWeight="bold" color={`${getScoreColor(item.score)}.600`} fontSize="lg">
                    {item.score}
                  </Text>
                </Flex>
                <Progress 
                  value={item.score} 
                  size="sm" 
                  colorScheme={getScoreColor(item.score)}
                  borderRadius="full"
                  hasStripe
                  isAnimated
                />
              </Box>
            ))}
          </VStack>
        </CardBody>
      </Card>
    );
  };

  const renderAISummary = () => {
    if (!profile?.profile?.aiSummary) return null;

    return (
      <Card 
        variant="outline" 
        borderColor="purple.300" 
        bg="linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)"
      >
        <CardBody>
          <HStack mb={3}>
            <Icon as={FaMagic} color="purple.500" boxSize={5} />
            <Heading size="md" color="purple.600">AI 灵魂洞察</Heading>
          </HStack>
          <Text fontSize="md" color="gray.700" lineHeight="1.8" fontStyle="italic">
            "{profile.profile.aiSummary}"
          </Text>
        </CardBody>
      </Card>
    );
  };

  const renderCommunicationStyle = () => {
    if (!profile?.profile?.communicationStyle) return null;

    return (
      <Stat>
        <StatLabel color="gray.600">
          <HStack>
            <Icon as={FaComments} />
            <Text>沟通风格</Text>
          </HStack>
        </StatLabel>
        <StatNumber color="purple.600" fontSize="2xl">
          {profile.profile.communicationStyle}
        </StatNumber>
        <StatHelpText>基于您的互动行为分析</StatHelpText>
      </Stat>
    );
  };

  const renderEmotionTendency = () => {
    if (!profile?.profile?.emotionTendency) return null;

    return (
      <Stat>
        <StatLabel color="gray.600">
          <HStack>
            <Icon as={FaHeart} />
            <Text>情感倾向</Text>
          </HStack>
        </StatLabel>
        <StatNumber color="pink.600" fontSize="2xl">
          {profile.profile.emotionTendency}
        </StatNumber>
        <StatHelpText>基于您的内容情感分析</StatHelpText>
      </Stat>
    );
  };

  const renderLoadingSkeleton = () => (
    <VStack spacing={6} align="stretch">
      <Card>
        <CardBody>
          <Flex align="center" gap={4}>
            <SkeletonCircle size="20" />
            <Box flex="1">
              <SkeletonText noOfLines={2} spacing={3} />
            </Box>
          </Flex>
        </CardBody>
      </Card>
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
        <GridItem>
          <Skeleton height="120px" borderRadius="lg" />
        </GridItem>
        <GridItem>
          <Skeleton height="120px" borderRadius="lg" />
        </GridItem>
      </Grid>
      <Skeleton height="200px" borderRadius="lg" />
      <Skeleton height="250px" borderRadius="lg" />
    </VStack>
  );

  if (isLoading) {
    return (
      <Container maxW="container.lg" py={8}>
        {renderLoadingSkeleton()}
      </Container>
    );
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading 
            size="xl" 
            bgGradient="linear(to-r, purple.400, pink.500)" 
            bgClip="text"
            mb={2}
          >
            灵魂画像引擎
          </Heading>
          <Text color="gray.600" fontSize="lg">
            深度理解你的个性、兴趣与价值观
          </Text>
        </Box>

        {!profile ? (
          <Card bg={gradientBg} borderColor="purple.200" variant="outline">
            <CardBody textAlign="center" py={12}>
              <Icon as={FaBrain} boxSize={16} color="purple.400" mb={4} />
              <Heading size="md" color="purple.600" mb={4}>
                开启你的灵魂画像之旅
              </Heading>
              <Text color="gray.600" mb={6} maxW="lg" mx="auto">
                通过 AI 深度分析您的瞬间、互动和表达方式，为您生成专属的灵魂数字画像
              </Text>
              {isAnalyzing && (
                <Box mb={6}>
                  <Text fontSize="sm" color="purple.600" mb={2}>
                    AI 正在分析中... {analysisProgress}%
                  </Text>
                  <Progress 
                    value={analysisProgress} 
                    size="sm" 
                    colorScheme="purple" 
                    borderRadius="full"
                    hasStripe
                    isAnimated
                  />
                </Box>
              )}
              <Button
                colorScheme="purple"
                size="lg"
                leftIcon={isAnalyzing ? <Spinner size="sm" /> : <FaBrain />}
                onClick={analyzeProfile}
                isLoading={isAnalyzing}
                loadingText="AI 分析中"
              >
                分析我的灵魂画像
              </Button>
            </CardBody>
          </Card>
        ) : (
          <>
            <Card bg="gradient" bgGradient="linear(to-r, purple.50, pink.50)">
              <CardBody>
                <Flex align="center" justify="space-between" flexWrap="wrap" gap={4}>
                  <HStack spacing={4}>
                    <Avatar 
                      size="xl" 
                      src={profile.user?.avatar} 
                      name={profile.user?.username}
                      icon={<FaUserCircle />}
                    />
                    <Box>
                      <Heading size="lg" color="purple.700">
                        {profile.user?.username}
                      </Heading>
                      <Text color="gray.600" mt={1}>
                        {profile.user?.bio || '探索生活的无限可能'}
                      </Text>
                    </Box>
                  </HStack>
                  <VStack>
                    <CircularProgress 
                      value={profile.profile?.matchScore || 0} 
                      size="100px"
                      color="purple.500"
                      thickness="8px"
                    >
                      <CircularProgressLabel>
                        <VStack spacing={0}>
                          <Text fontSize="2xl" fontWeight="bold" color="purple.600">
                            {profile.profile?.matchScore || 0}
                          </Text>
                          <Text fontSize="xs" color="gray.600">匹配度</Text>
                        </VStack>
                      </CircularProgressLabel>
                    </CircularProgress>
                  </VStack>
                </Flex>
              </CardBody>
            </Card>

            {profile.analysis?.aiEnhanced && (
              <Alert status="success" variant="left-accent" borderRadius="lg">
                <AlertIcon as={FaCheckCircle} />
                <Box>
                  <AlertTitle color="green.700">AI 深度分析完成</AlertTitle>
                  <AlertDescription fontSize="sm" color="gray.700">
                    基于 {profile.analysis?.momentCount || 0} 条瞬间和 {profile.analysis?.interactionCount || 0} 次互动，AI 为您生成了专属灵魂画像
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            {renderAISummary()}

            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
              <GridItem>
                {renderCommunicationStyle()}
              </GridItem>
              <GridItem>
                {renderEmotionTendency()}
              </GridItem>
            </Grid>

            {renderInterests()}
            {renderValues()}
            {renderPersonalityVector()}

            <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
              <Text fontSize="sm" color="gray.500">
                最后更新：{profile.profile?.updatedAt ? new Date(profile.profile.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '未知'}
              </Text>
              <Button
                leftIcon={isAnalyzing ? <Spinner size="sm" /> : <FaSync />}
                variant="outline"
                colorScheme="purple"
                onClick={analyzeProfile}
                isLoading={isAnalyzing}
                loadingText="AI 重新分析中"
              >
                重新分析
              </Button>
            </Flex>
          </>
        )}

        <Box 
          p={6} 
          bg="blue.50" 
          borderRadius="lg" 
          borderLeft="4px solid" 
          borderColor="blue.400"
        >
          <HStack spacing={2} mb={2}>
            <Icon as={FaStar} color="blue.500" />
            <Text fontWeight="bold" color="blue.700">关于灵魂画像</Text>
          </HStack>
          <VStack align="start" spacing={1} fontSize="sm" color="gray.700">
            <Text>• 灵魂画像基于您的瞬间内容和互动行为生成</Text>
            <Text>• AI 模型深度分析，让画像更精准更有温度</Text>
            <Text>• 每次分析都会融合最新的数据，让画像更了解真实的你</Text>
            <Text>• 您的数据受到严格保护，仅用于优化社交体验</Text>
            <Text>• 持续使用平台，画像会越来越了解真实的你</Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};

export default SoulProfileEngine;