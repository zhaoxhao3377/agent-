import React, { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon,
  Flex,
  extendTheme
} from '@chakra-ui/react';
import { FaUserCircle, FaBrain, FaRobot, FaSignOutAlt } from 'react-icons/fa';
import SoulProfileEngine from './components/SoulProfileEngine';
import SocialAssistant from './components/SocialAssistant';
import axios from 'axios';

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      50: '#ffe4f1',
      100: '#ffb3d9',
      200: '#ff80c0',
      300: '#ff4da7',
      400: '#ff1a8e',
      500: '#e60074',
      600: '#b3005b',
      700: '#800041',
      800: '#4d0027',
      900: '#1a000e',
    },
  },
  fonts: {
    heading: `'Inter', sans-serif`,
    body: `'Inter', sans-serif`,
  },
});

const App = () => {
  const [user, setUser] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('soulmateUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      toast({
        title: '请填写完整信息',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isLoginMode ? '/api/users/login' : '/api/users/register';
      const response = await axios.post(endpoint, {
        username: username.trim(),
        password: password.trim()
      });

      if (response.data.success) {
        const userData = response.data.data;
        setUser(userData);
        localStorage.setItem('soulmateUser', JSON.stringify(userData));
        
        toast({
          title: isLoginMode ? '登录成功' : '注册成功',
          description: `欢迎，${userData.username}！`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        onClose();
        setUsername('');
        setPassword('');
      }
    } catch (error) {
      toast({
        title: isLoginMode ? '登录失败' : '注册失败',
        description: error.response?.data?.message || '请稍后重试',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('soulmateUser');
    toast({
      title: '已退出登录',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const openAuthModal = (mode) => {
    setIsLoginMode(mode);
    setUsername('');
    setPassword('');
    onOpen();
  };

  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" bg="gray.50">
        <Box 
          bg="white" 
          boxShadow="sm" 
          position="sticky" 
          top="0" 
          zIndex="1000"
          borderBottom="1px solid"
          borderColor="gray.200"
        >
          <Container maxW="container.xl" py={4}>
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <Icon as={FaBrain} boxSize={8} color="purple.500" />
                <Heading 
                  size="lg" 
                  bgGradient="linear(to-r, purple.500, pink.500)" 
                  bgClip="text"
                >
                  Soulmate Agent
                </Heading>
              </HStack>

              {user ? (
                <Menu>
                  <MenuButton as={Button} variant="ghost">
                    <HStack spacing={2}>
                      <Avatar 
                        size="sm" 
                        src={user.avatar} 
                        name={user.username}
                        icon={<FaUserCircle />}
                      />
                      <Text fontWeight="semibold">{user.username}</Text>
                    </HStack>
                  </MenuButton>
                  <MenuList>
                    <MenuItem 
                      icon={<FaSignOutAlt />} 
                      onClick={handleLogout}
                      color="red.500"
                    >
                      退出登录
                    </MenuItem>
                  </MenuList>
                </Menu>
              ) : (
                <HStack spacing={3}>
                  <Button 
                    variant="ghost" 
                    colorScheme="purple"
                    onClick={() => openAuthModal(true)}
                  >
                    登录
                  </Button>
                  <Button 
                    colorScheme="purple"
                    onClick={() => openAuthModal(false)}
                  >
                    注册
                  </Button>
                </HStack>
              )}
            </Flex>
          </Container>
        </Box>

        <Container maxW="container.xl" py={8}>
          {!user ? (
            <VStack spacing={8} py={16}>
              <Icon as={FaBrain} boxSize={20} color="purple.400" />
              <VStack spacing={4}>
                <Heading 
                  size="2xl" 
                  textAlign="center"
                  bgGradient="linear(to-r, purple.500, pink.500)" 
                  bgClip="text"
                >
                  欢迎来到 Soulmate Agent
                </Heading>
                <Text fontSize="xl" color="gray.600" textAlign="center" maxW="2xl">
                  不是一个简单的聊天机器人，而是每个用户专属的、深度理解其灵魂的"数字孪生"与"社交导航员"
                </Text>
              </VStack>
              <HStack spacing={4} pt={4}>
                <Button 
                  size="lg" 
                  colorScheme="purple"
                  leftIcon={<FaUserCircle />}
                  onClick={() => openAuthModal(false)}
                >
                  立即注册
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  colorScheme="purple"
                  onClick={() => openAuthModal(true)}
                >
                  已有账号？登录
                </Button>
              </HStack>

              <Box 
                w="100%" 
                maxW="4xl" 
                mt={12}
                p={8}
                bg="white"
                borderRadius="xl"
                boxShadow="md"
              >
                <VStack spacing={6} align="stretch">
                  <Heading size="lg" textAlign="center" color="purple.600">
                    核心功能
                  </Heading>
                  <VStack spacing={4}>
                    <HStack spacing={4} align="start" w="100%">
                      <Icon as={FaBrain} boxSize={8} color="purple.500" mt={1} />
                      <Box flex="1">
                        <Heading size="md" color="purple.700" mb={2}>
                          灵魂画像引擎
                        </Heading>
                        <Text color="gray.600">
                          深度学习和理解用户的个性、兴趣、价值观和社交需求，生成多维度的灵魂数字画像
                        </Text>
                      </Box>
                    </HStack>
                    <HStack spacing={4} align="start" w="100%">
                      <Icon as={FaRobot} boxSize={8} color="pink.500" mt={1} />
                      <Box flex="1">
                        <Heading size="md" color="pink.700" mb={2}>
                          智能社交助手
                        </Heading>
                        <Text color="gray.600">
                          AI 帮你生成精彩文案、破冰话术，让社交变得轻松有趣，告别尬聊
                        </Text>
                      </Box>
                    </HStack>
                  </VStack>
                </VStack>
              </Box>
            </VStack>
          ) : (
            <Tabs 
              variant="soft-rounded" 
              colorScheme="purple" 
              size="lg"
              isFitted
            >
              <TabList mb={8} flexWrap="wrap" justifyContent="center">
                <Tab>
                  <Icon as={FaBrain} mr={2} />
                  灵魂画像引擎
                </Tab>
                <Tab>
                  <Icon as={FaRobot} mr={2} />
                  智能社交助手
                </Tab>
              </TabList>

              <TabPanels>
                <TabPanel p={0}>
                  <SoulProfileEngine userId={user.userId} />
                </TabPanel>
                <TabPanel p={0}>
                  <SocialAssistant userId={user.userId} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </Container>

        <Modal isOpen={isOpen} onClose={onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              {isLoginMode ? '登录' : '注册'} Soulmate Agent
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>用户名</FormLabel>
                  <Input
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>密码</FormLabel>
                  <Input
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  />
                </FormControl>
                <Button
                  w="100%"
                  colorScheme="purple"
                  onClick={handleAuth}
                  isLoading={isLoading}
                  loadingText={isLoginMode ? '登录中' : '注册中'}
                >
                  {isLoginMode ? '登录' : '注册'}
                </Button>
                <Button
                  w="100%"
                  variant="ghost"
                  onClick={() => setIsLoginMode(!isLoginMode)}
                >
                  {isLoginMode ? '没有账号？立即注册' : '已有账号？去登录'}
                </Button>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>

        <Box 
          as="footer" 
          py={6} 
          mt={12} 
          borderTop="1px solid" 
          borderColor="gray.200"
          bg="white"
        >
          <Container maxW="container.xl">
            <Text textAlign="center" color="gray.600" fontSize="sm">
              Soulmate Agent - 理解·呈现·连接 By HAISNAP
            </Text>
          </Container>
        </Box>
      </Box>
    </ChakraProvider>
  );
};

export default App;