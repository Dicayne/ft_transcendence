import {
  Controller,
  Get,
  Post,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { RequestWithUser } from './auth.interface';
import JwtAuthGuard, {
  AuthenticatedGuard,
  FortyTwoAuthGuard,
  GithubGuard,
  LocalAuthGuard,
} from './guards';
import { AuthenticationProvider } from './auth.interface';
import { Inject } from '@nestjs/common';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: AuthenticationProvider,
  ) {}
  /**
   * GET /auth/login
   * This is the route user will visit to authenticate
   */
  @Get('login')
  @UseGuards(FortyTwoAuthGuard)
  async login() {
    return;
  }

  @Get('login/github')
  @UseGuards(GithubGuard)
  async loginGithub() {
    return;
  }

  @Post('login/local')
  @UseGuards(LocalAuthGuard)
  loginLocal(@Req() req: RequestWithUser, @Res() res: Response) {
    const { user } = req;
    const cookie = this.authService.getCookieWithJwtToken(user.id);
    res.setHeader('Set-Cookie', cookie);
    user.password = undefined;
    return res.send(user);
  }

  /**
   * GET /auth/redirect
   * This is the redirect URL the OAuth2 provider will call
   */
  @Get('redirect')
  @Redirect('/')
  @UseGuards(FortyTwoAuthGuard)
  async redirect(@Req() req: RequestWithUser, @Res() res: Response) {
    const { user } = req;
    const cookie = this.authService.getCookieWithJwtToken(user.id);
    res.setHeader('Set-Cookie', cookie);
    user.password = undefined;
    return;
  }

  @Get('redirect/github')
  @Redirect('/')
  @UseGuards(GithubGuard)
  async redirectGithub(@Req() req: RequestWithUser, @Res() res: Response) {
    const { user } = req;
    const cookie = this.authService.getCookieWithJwtToken(user.id);
    res.setHeader('Set-Cookie', cookie);
    user.password = undefined;
    return;
  }

  /**
   * GET /auth/status
   * Retrieve the auth status
   */
  @Get('status')
  @UseGuards(AuthenticatedGuard)
  async status(@Req() req) {
    return req.user;
  }

  @Get('jwt-status')
  @UseGuards(JwtAuthGuard)
  jwtStatus(@Req() req: RequestWithUser) {
    const { id, username, socketID, avatar } = req.user;
    return { id, username, socketID, avatar };
  }

  /**
   * GET /auth/logout
   * Logging the user out
   */
  @Get('logout')
  @Redirect('/')
  async logout(@Req() req, @Res() res: Response) {
    res.setHeader('Set-Cookie', this.authService.getCookieForLogout());
    req.logOut();
  }
}
